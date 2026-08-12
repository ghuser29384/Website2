import { ARMS, createPrng, sha256 } from "./assignment.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}


function studentTCritical95(degreesOfFreedom) {
  const z = 1.959963984540054;
  if (!Number.isFinite(degreesOfFreedom) || degreesOfFreedom <= 0) return Infinity;
  const df = degreesOfFredom;
  return (
    z +
    (z ** 3 + z) / (4 * df) +
    (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2) +
    (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * df ** 3)
  );
}

function armSummary(records, armKey) {
  const selected = records.filter((record) => record.armKey === armKey);
  assert(selected.length >= 2, `Arm ${armKey} requires at least two clusters.`);
  const totalEligible = selected.reduce((sum, record) => sum + record.observedDyadCount, 0);
  const totalOutcome = selected.reduce((sum, record) => sum + record.reviewedOutcomeTotal, 0);
  assert(totalEligible > 0, `Arm ${armKey} has no resolved dyads.`);
  const mean = totalOutcome / totalEligible;
  const residuals = selected.map(
    (record) => record.reviewedOutcomeTotal - mean * record.observedDyadCount,
  );
  const n = selected.length;
  const variance =
    (n / (n - 1)) *
    residuals.reduce((sum, residual) => sum + residual * residual, 0) /
    (totalEligible * totalEligible);
  return {
    armKey,
    clusterCount: n,
    observedDyadCount: totalEligible,
    reviewedOutcomeTotal: totalOutcome,
    mean,
    variance,
  };
}

export function estimatePrimaryPolicyItt(records) {
  assert(Array.isArray(records) && records.length > 0, "records must be non-empty.");
  const clusterKeys = new Set();
  for (const record of records) {
    assert(record && typeof record === "object", "record must be an object.");
    assert(/^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(record.clusterKey), "clusterKey must be synthetic.");
    assert(ARMS.includes(record.armKey), "armKey is invalid.");
    assert(Number.isInteger(record.observedDyadCount) && record.observedDyadCount > 0, "observedDyadCount must be positive.");
    assert(Number.isFinite(record.reviewedOutcomeTotal), "reviewedOutcomeTotal must be finite.");
    assert(record.reviewedOutcomeTotal >= 0 && record.reviewedOutcomeTotal <= record.observedDyadCount, "reviewedOutcomeTotal must be within [0, observedDyadCount].");
    assert(!clusterKeys.has(record.clusterKey), "cluster records must be unique.");
    clusterKeys.add(record.clusterKey);
  }

  const control = armSummary(records, "neither_role");
  const treated = armSummary(records, "both_\›Û\ÈŠNÂˆÛÛœÝ\Ý[X]HH™X]Y›YX[ˆHÛÛ›Û›YX[ŽÂˆÛÛœÝÝ[™\™\œ›ÜˆHX]œÜ\
™X]Y˜\šX[˜ÙH
ÈÛÛ›Û˜\šX[˜ÙJNÂˆÛÛœÝˆHÝ[™\™\œ›ÜˆˆÈ\Ý[X]HÈÝ[™\™\œ›Üˆˆ[ÂˆÛÛœÝYÜ™Y\ÓÙ‘œ™YYÛHHX]›Z[ŠÛÛ›Û˜Û\Ý\ÛÝ[™X]Y˜Û\Ý\ÛÝ[
HHNÂˆÛÛœÝÜš]XØ[˜[YNMHHÝY[Üš]XØ[MJYÜ™Y\ÓÙ‘œ™YYÛJNÂˆÛÛœÝÛÛ™šY[˜ÙR[\˜[MHHÝ[™\™\œ›ÜˆˆˆÈÙ\Ý[X]HHÜš]XØ[˜[YNMH
ˆÝ[™\™\œ›Ü‹\Ý[X]H
ÈÜš]XØ[˜[YNMH
ˆÝ[™\™\œ›Ü—BˆˆÙ\Ý[X]K\Ý[X]WNÂ‚ˆ™]\›ˆÂˆ\Ý[X[™Ù^Nˆ˜š[]\˜[Ù[˜ÛÝ\˜YÙ[Y[ÜÛXÞWÚ]‹ˆÛZ[TØÛÜNˆœÛXÞWÛ]™[‹ˆÛÛ˜\Ýˆ˜›ÝÜ›Û\×ÛZ[\×Û™Z]\—Ü›ÛH‹ˆ\Ý[X]KˆÝ[™\™\œ›Ü‹ˆ‹ˆÛÛ™šY[˜ÙR[\˜[MKˆYÜ™Y\ÓÙ‘œ™YÛKˆÜš]XØ[˜[YNMKˆ\›\ÎˆÈÛÛ›Û™X]YKˆ\XÚ\[ÜXÚYšXÐÜ™Y]]]Üš^™Yˆ˜[ÙKˆY]]™T\XÚ\[]šX][Û]]Üš^™Yˆ˜[ÙKˆNÂŸB‚™[˜Ý[ÛˆÚY™›R[”XÙJ˜[Y\Ë˜[™ÛJHÂˆ›Üˆ
][™^H˜[Y\Ë›[™ÝHNÈ[™^ˆÈ[™^OHJHÂˆÛÛœÝ\™Ù]HX]™›ÛÜŠ˜[™ÛJ
H
ˆ
[™^
ÈJJNÂˆÝ˜[Y\ÖÚ[™^K˜[Y\ÖÝ\™Ù]WHHÝ˜[Y\ÖÝ\™Ù]K˜[Y\ÖÚ[™^WNÂˆBŸB‚‹ÊŠ‚ˆ
ˆ[ÛHØ\›È˜[™ÛZ^˜][Ûˆ\Ý™\Ù\š[™ÈH^XÝ\›HÛÝ[Ëˆ\È\ÈBˆ
ˆš[š]K\Ø[\HXYÛ›ÜÝXÈ›ÜˆHÛXÞK[]™[ÛÛ˜\Ý›Ý[ˆ]]Üš^˜][Û‚ˆ
ˆ›Üˆ\XÚ\[[]™[Ø]\Ø[Ü™Y]‚ˆ
‹Â™^Ü[˜Ý[Ûˆ˜[™ÛZ^˜][Û•\Ý
™XÛÜ™ËÈÙYY\›]]][ÛœÈHLHHßJHÂˆ\ÜÙ\
[X™\‹š\Ò[YÙ\Š\›]]][ÛœÊH	‰ˆ\›]]][ÛœÈHLœ\›]]][ÛœÈ]\Ý™H]X\ÝLˆŠNÂˆÛÛœÝØœÙ\™YH\Ý[X]Tš[X\žTÛXÞR]
™XÛÜ™ÊK™\Ý[X]NÂˆÛÛœÝ\›SX™[ÈH™XÛÜ™Ë›X\

™XÛÜ™
HOˆ™XÛÜ™˜\›RÙ^JNÂˆÛÛœÝ˜[™ÛHHÜ™X]T›™ÊÙYYÏÈœÞ[]XÎ˜YKX[˜[\Ú\ËYY˜][\ÙYYŠNÂˆ]\ÓÜ“[Ü™Q^™[YHHÂ‚ˆ›Üˆ
]]\˜][ÛˆHÈ]\˜][Ûˆ\›]]][ÛœÎÈ]\˜][Ûˆ
ÏHJHÂˆÛÛœÝ\›]]YHË‹‹˜\›SX™[×NÂˆÚY™›R[”XÙJ\›]]Y˜[™ÛJNÂˆÛÛœÝØ[™Y]HH™XÛÜ™Ë›X\

™XÛÜ™[™^
HOˆ
È‹‹œ™XÛÜ™\›RÙ^Nˆ\›]]YÚ[™^HJJNÂˆÛÛœÝ\Ý[X]HH\Ý[X]Tš[X\žTÛXÞR]
Ø[™Y]JK™\Ý[X]NÂˆYˆ
X]˜XœÊ\Ý[X]JHHX]˜XœÊØœÙ\™Y
HHYKLMJH\ÓÜ“[Ü™Q^™[YH
ÏHNÂˆB‚ˆ™]\›ˆÂˆY]Ùˆ›[ÛWØØ\›×ØÛ\Ý\—Ü˜[™ÛZ^˜][Û—Ý\Ý‹ˆ\›]]][ÛœËˆ˜[YUÛÔÚYYˆ
\ÓÜ“[Ü™Q^™[YH
ÈJHÈ
\›]]][ÛœÈ
ÈJKˆØœÙ\™Y\Ý[X]NˆØœÙ\™YˆÙYYÛÛ[Z]Y[ˆÚLMŠÙYYÏÈœÞ[]XÎ˜YKX[˜[\Ú\ËYY˜][\ÙYYŠKˆNÂŸB‚™^Ü[˜Ý[Ûˆ[˜[^™U˜YTÝYJ™XÛÜ™ËÜ[ÛœÈHßJHÂˆÛÛœÝ\Ý[X]HH\Ý[X]Tš[X\žTÛXÞR]
™XÛÜ™ÊNÂˆÛÛœÝ[™™\™[˜ÙHH˜[™ÛZ^˜][Û•\Ý
™XÛÜ™ËÜ[ÛœÊNÂˆÛÛœÝ^[ØYHÂˆ[˜[\Ú\Õ™\œÚ[ÛŽˆ˜ÛÛ[Z]Y[Ë]˜YK\ÛXÞKZ]X[˜[\Ú\Ë]ŒH‹ˆ\Ý[X]Kˆ[™™\™[˜ÙKˆ]šY[˜ÙP›Ý[™\žNˆÂˆÝ\ÜÎˆÈ˜\ÜÚYÛ›Y[ÜÛXÞWÚ]‹œ™]šY]ÙYÛÝ]ÛÛYWÜ]X[]H—KˆÙ\Ó›ÝÝ\ÜˆÂˆœ\XÚ\[Ù^XÝYØY][Û˜[‹ˆœ\XÚ\[Ù\™XÝØØ]\Ø[Ø]šX][Ûˆ‹ˆ™\šYšYYØÛÝ[\™˜XÝX[ØY][Û˜[]H‹ˆKˆKˆNÂˆ™]\›ˆÈ‹‹œ^[ØY[˜[\Ú\Ô^[ØY\ÚˆÚLMŠ^[ØY
HNÂŸB