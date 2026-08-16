const { Readable } = require("node:stream");

const {
  render,
  readStream,
  buildReport,
  parseAudit,
  formatFix,
  formatOrigin,
  formatSummary,
} = require("../audit-report");

/** Squelette minimal d'une sortie `npm audit --json`. */
function auditFixture({ vulnerabilities = {}, counts = {} } = {}) {
  return {
    vulnerabilities,
    metadata: {
      vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0, ...counts },
    },
  };
}

describe("formatFix", () => {
  it("should point to npm audit fix when the fix needs no version bump", () => {
    // Arrange
    const fixAvailable = true;

    // Act
    const result = formatFix(fixAvailable);

    // Assert
    expect(result).toBe("`npm audit fix`");
  });

  it("should flag the bump as major when the fix crosses a major version", () => {
    const result = formatFix({ name: "expo", version: "57.0.13", isSemVerMajor: true });

    expect(result).toBe("expo@57.0.13 (majeure)");
  });

  it("should name the target version without mention when the bump is minor", () => {
    const result = formatFix({ name: "nodemailer", version: "9.0.5", isSemVerMajor: false });

    expect(result).toBe("nodemailer@9.0.5");
  });

  it("should report no fix when npm proposes none", () => {
    const result = formatFix(false);

    expect(result).toBe("aucun");
  });
});

describe("formatOrigin", () => {
  it("should list advisory titles when the package is directly affected", () => {
    const vulnerability = {
      via: [
        { title: "DoS via ICNS parser" },
        { title: "DoS via JXL parser" },
      ],
    };

    const result = formatOrigin(vulnerability);

    expect(result).toBe("DoS via ICNS parser<br>DoS via JXL parser");
  });

  it("should mark the package as transitive when it is only reached through dependencies", () => {
    const vulnerability = { via: ["metro", "react-native"] };

    const result = formatOrigin(vulnerability);

    expect(result).toBe("transitif");
  });
});

describe("formatSummary", () => {
  it("should detail counts per severity when vulnerabilities are found", () => {
    const counts = { critical: 0, high: 14, moderate: 16, low: 0, info: 0, total: 30 };

    const result = formatSummary(counts);

    expect(result).toBe("**30 vulnérabilité(s)** — 14 high · 16 moderate");
  });

  it("should announce a clean audit when no vulnerability is reported", () => {
    const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };

    const result = formatSummary(counts);

    expect(result).toBe("Aucune vulnérabilité connue ✅");
  });
});

describe("buildReport", () => {
  it("should omit the table when no high or critical vulnerability is found", () => {
    const audit = auditFixture({
      vulnerabilities: { lodash: { name: "lodash", severity: "moderate", via: [], fixAvailable: true } },
      counts: { moderate: 1, total: 1 },
    });

    const result = buildReport(audit);

    expect(result).not.toContain("| Paquet |");
  });

  it("should list critical entries before high ones when both are present", () => {
    const audit = auditFixture({
      vulnerabilities: {
        ws: { name: "ws", severity: "high", via: [{ title: "DoS" }], fixAvailable: true },
        tar: { name: "tar", severity: "critical", via: [{ title: "Path traversal" }], fixAvailable: true },
      },
      counts: { critical: 1, high: 1, total: 2 },
    });

    const result = buildReport(audit);

    expect(result.indexOf("`tar`")).toBeLessThan(result.indexOf("`ws`"));
  });

  it("should render one table row per reported package when high vulnerabilities exist", () => {
    const audit = auditFixture({
      vulnerabilities: {
        "image-size": {
          name: "image-size",
          severity: "high",
          via: [{ title: "Infinite loop" }],
          fixAvailable: { name: "expo", version: "57.0.13", isSemVerMajor: true },
        },
      },
      counts: { high: 1, total: 1 },
    });

    const result = buildReport(audit);

    expect(result).toContain("| `image-size` | high | Infinite loop | expo@57.0.13 (majeure) |");
  });
});

describe("parseAudit", () => {
  it("should return the parsed payload when stdin holds a valid audit", () => {
    const audit = parseAudit(JSON.stringify(auditFixture()));

    expect(audit.metadata.vulnerabilities.total).toBe(0);
  });

  it("should throw when stdin is empty", () => {
    expect(() => parseAudit("   ")).toThrow("Aucune entrée reçue");
  });

  it("should throw with the npm summary when the audit itself failed", () => {
    const raw = JSON.stringify({ error: { summary: "registre injoignable" } });

    expect(() => parseAudit(raw)).toThrow("npm audit a échoué : registre injoignable");
  });
});

describe("readStream", () => {
  it("should concatenate every chunk when the stream completes", async () => {
    const stream = Readable.from(['{"a":', "1}"]);

    const result = await readStream(stream);

    expect(result).toBe('{"a":1}');
  });

  it("should reject when the stream emits an error", async () => {
    const stream = new Readable({ read() { this.destroy(new Error("tuyau rompu")); } });

    await expect(readStream(stream)).rejects.toThrow("tuyau rompu");
  });
});

describe("render", () => {
  it("should write the report to the output stream when the input is a valid audit", async () => {
    const chunks = [];
    const output = { write: (chunk) => chunks.push(chunk) };

    await render(Readable.from([JSON.stringify(auditFixture())]), output);

    expect(chunks.join("")).toBe("## Audit des dépendances\n\nAucune vulnérabilité connue ✅\n");
  });
});
