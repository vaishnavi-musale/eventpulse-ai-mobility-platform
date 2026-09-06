// §27.1 — Signed offline token credential tests (HMAC signature + validity window)
import {
  signOfflineToken,
  verifySignedToken,
  SignedTokenPayload,
} from "./signed-token";

const SECRET = "test-secret";

const payload: SignedTokenPayload = {
  tokenId: "tok-1",
  capacityUnitRef: "unit-1",
  attendeeRef: "attendee-1",
  gLevel: "G3",
  validFrom: new Date(Date.now() - 60_000).toISOString(),
  validUntil: new Date(Date.now() + 60_000).toISOString(),
};

describe("Signed offline token (§27.1)", () => {
  it("signs a credential and verifies it within the validity window", () => {
    const token = signOfflineToken(payload, SECRET);
    const result = verifySignedToken(token.credential, SECRET);
    expect(result.valid).toBe(true);
    expect(result.payload?.tokenId).toBe("tok-1");
    expect(result.payload?.gLevel).toBe("G3");
  });

  it("rejects a token with a tampered signature", () => {
    const token = signOfflineToken(payload, SECRET);
    const forged = {
      ...token.credential,
      signature: Buffer.from("tampered").toString("base64url"),
    };
    expect(verifySignedToken(forged, SECRET).valid).toBe(false);
  });

  it("rejects a token with the wrong secret", () => {
    const token = signOfflineToken(payload, SECRET);
    expect(verifySignedToken(token.credential, "wrong-secret").valid).toBe(
      false,
    );
  });

  it("rejects a token whose validity window has expired (§27.1 offline validity)", () => {
    const expired: SignedTokenPayload = {
      ...payload,
      validFrom: new Date(Date.now() - 120_000).toISOString(),
      validUntil: new Date(Date.now() - 60_000).toISOString(),
    };
    const token = signOfflineToken(expired, SECRET);
    const result = verifySignedToken(token.credential, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("validity window expired");
  });

  it("rejects a malformed payload", () => {
    const result = verifySignedToken(
      { signature: "abc", payloadJson: "not-json" },
      SECRET,
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("malformed payload");
  });
});
