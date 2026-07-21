#!/usr/bin/env bash

set -euo pipefail

forwarded=()
while (($#)); do
  case "$1" in
    --strictPort)
      shift
      ;;
    --host)
      forwarded+=(--hostname "${2:-0.0.0.0}")
      shift 2
      ;;
    --host=*)
      forwarded+=("--hostname=${1#--host=}")
      shift
      ;;
    *)
      forwarded+=("$1")
      shift
      ;;
  esac
done

exec node ./node_modules/next/dist/bin/next dev --webpack "${forwarded[@]}"
