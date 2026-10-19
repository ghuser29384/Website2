// Synthetic validation only: block external Node connections during tests/build.
import net from "node:net";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";

const blocked = () => { throw new Error("Network disabled for build-only validation"); };
globalThis.fetch = blocked;
http.request = http.get = https.request = https.get = blocked;
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = args[0];
  if ((typeof first === "string" && first.startsWith("/")) ||
      (first && typeof first === "object" && typeof first.path === "string")) {
    return connect.apply(this, args);
  }
  return blocked();
};
syncBuiltinESMExports();
