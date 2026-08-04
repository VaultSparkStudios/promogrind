import crypto from 'node:crypto';

export function summarizeVitestReport(report, { exitCode = 0, partial = false, generatedAt = new Date().toISOString(), commitSha = null } = {}) {
  if (!report || !Array.isArray(report.testResults)) throw new Error('Vitest JSON report is missing testResults');
  const filesTotal = report.testResults.length;
  const filesPassing = report.testResults.filter((entry) => entry.status === 'passed').length;
  const assertionsTotal = Number(report.numTotalTests);
  const assertionsPassing = Number(report.numPassedTests);
  if (!Number.isInteger(assertionsTotal) || !Number.isInteger(assertionsPassing)) throw new Error('Vitest assertion counts are invalid');
  const complete = !partial && filesTotal > 0;
  const success = complete && exitCode === 0 && report.success === true && filesPassing === filesTotal && assertionsPassing === assertionsTotal;
  const reportSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return {
    schemaVersion: '1.0', generatedAt, commitSha, complete, partial, success, exitCode,
    files: { passing: filesPassing, total: filesTotal },
    assertions: { passing: assertionsPassing, total: assertionsTotal },
    reportSha256,
  };
}

export function applyVitestEvidence(status, receipt) {
  const next = { ...status, testsLatestRunState: receipt.success ? 'green' : receipt.complete ? 'red' : 'inconclusive', testEvidence: receipt };
  if (receipt.complete) {
    const day = receipt.generatedAt.slice(0, 10);
    next.testsPassing = receipt.files.passing;
    next.testsTotal = receipt.files.total;
    next.testsLastRun = day;
    next.testsAssertionsPassing = receipt.assertions.passing;
    next.testsAssertionsTotal = receipt.assertions.total;
    next.testsAssertionsFiles = receipt.files.total;
    next.testsAssertionsLastRun = day;
  }
  return next;
}
