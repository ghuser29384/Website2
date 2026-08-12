import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 1000;

interface ExportRouteContext {
  params: Promise<{ exportId: string }>;
}

function privateHeaders() {
  return {
    "Cache-Control": "no-store, private, max-age=0",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function errorResponse(status: number, message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status, headers: privateHeaders() },
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function downloadFilename(exportId: string) {
  return `evidence-credibility-calibration-${exportId.slice(0, 12)}.jsonl`;
}

export async function GET(_request: Request, context: ExportRouteContext) {
  const { exportId } = await context.params;
  if (!UUID_PATTERN.test(exportId)) {
    return errorResponse(400, "The calibration export identifier is invalid.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return errorResponse(401, "Sign in before downloading calibration research data.");
  }

  const { data: manifestData, error: manifestError } = await (supabase as any).rpc(
    "get_evidence_credibility_calibration_export_manifest_v1",
    { p_export_id: exportId },
  );
  if (manifestError) {
    return errorResponse(403, manifestError.message);
  }
  const manifest = Array.isArray(manifestData)
    ? asRecord(manifestData[0])
    : asRecord(manifestData);
  if (!manifest) {
    return errorResponse(404, "The immutable calibration export was not found.");
  }

  const expectedRows = Number(manifest.row_count ?? 0);
  if (!Number.isInteger(expectedRows) || expectedRows < 1) {
    return errorResponse(409, "The immutable calibration export manifest is malformed.");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              recordType: "manifest",
              exportId: manifest.export_id,
              exportSchemaVersion: manifest.export_schema_version,
              analysisPlanVersion: manifest.analysis_plan_version,
              analysisPlanHash: manifest.analysis_plan_hash,
              sourceCutoffAt: manifest.source_cutoff_at,
              pseudonymizationKeyCommitment:
                manifest.pseudonymization_key_commitment,
              rowCount: manifest.row_count,
              rowsDigest: manifest.rows_digest,
              manifestHash: manifest.manifest_hash,
              createdAt: manifest.created_at,
              rawEvidenceIncluded: false,
              rawIdentityIncluded: false,
              exactPaymentDataIncluded: false,
              shadowOnly: true,
            })}\n`,
          ),
        );

        let offset = 0;
        let emitted = 0;
        while (offset < expectedRows) {
          const { data, error } = await (supabase as any).rpc(
            "list_evidence_credibility_calibration_export_rows_v1",
            {
              p_export_id: exportId,
              p_limit: Math.min(PAGE_SIZE, expectedRows - offset),
              p_offset: offset,
            },
          );
          if (error) throw new Error(error.message);
          const rows = Array.isArray(data) ? data : [];
          if (!rows.length) {
            throw new Error("The immutable export ended before its manifest row count.");
          }

          for (const value of rows) {
            const row = asRecord(value);
            if (!row) throw new Error("The immutable export contains a malformed row.");
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  recordType: "observation",
                  rowNumber: row.row_number,
                  rowHash: row.row_hash,
                  observation: row.observation,
                })}\n`,
              ),
            );
            emitted += 1;
          }
          offset += rows.length;
        }

        if (emitted !== expectedRows) {
          throw new Error("The immutable export row count does not match its manifest.");
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...privateHeaders(),
      "Content-Disposition": `attachment; filename="${downloadFilename(exportId)}"`,
      "Content-Type": "application/x-ndjson; charset=utf-8",
    },
  });
}
