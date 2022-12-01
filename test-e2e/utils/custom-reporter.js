/* global require module */

const {DefaultReporter} = require("@jest/reporters");

/**
 * Overrides Jest's default reporter to filter out known console messages,
 * and prints a summary at the end of the test run.
 */
class CustomReporter extends DefaultReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig);
  }

  // Override DefaultReporter method
  printTestFileHeader(testPath, config, result) {
    debugger
    DefaultReporter.prototype.printTestFileHeader.call(
      this,
      testPath,
      config,
      result
    );
  }

	printTestFileFailureMessage(testPath, config, result) {
    debugger
    DefaultReporter.prototype.printTestFileFailureMessage.call(
      this,
      testPath,
      config,
      result
    );
  }

  testFinished(testPath, config, result) {
    debugger
    result.testResults = []
    DefaultReporter.prototype.testFinished.call(
      this,
      testPath,
      config,
      result
    );
  }
	
  onTestResult(testPath, config, result) {
    debugger
    result.testResults = []
    DefaultReporter.prototype.onTestResult.call(
      this,
      testPath,
      config,
      result
    );
  }

  onTestCaseResult(test, testCaseResult) {
    debugger
    testCaseResult.failureDetails = []
    testCaseResult.failureMessages = []
    DefaultReporter.prototype.onTestCaseResult.call(
      this,
      test,
      testCaseResult
    );
  }

  onRunStart(...args) {
    DefaultReporter.prototype.onRunStart.call(this, ...args);
  }

  onRunComplete(...args) {
    DefaultReporter.prototype.onRunComplete.call(this, ...args);
  }
}

module.exports = CustomReporter;