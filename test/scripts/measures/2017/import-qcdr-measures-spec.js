// Libraries
const chai = require('chai');
const assert = chai.assert;
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

// Test data
const year = 2017;
const testMeasures = '../../../test/scripts/measures/' + year + '/fixtures/test-measures-data.json';
const testMeasures2 = '../../../test/scripts/measures/' + year + '/fixtures/test-measures-data2.json';
const testCsv = '../../../test/scripts/measures/' + year + '/fixtures/test-qcdr.csv';
const testCsv2Cols = '../../../test/scripts/measures/' + year + '/fixtures/test-qcdr-2cols.csv';
const qcdrStrataNamesFile = '../../../util/measures/' + year + '/qcdr-measures-strata-names.json';
const outputArg = '../../../test/scripts/measures/' + year + '/fixtures/test-measures-data-output.json';
const outputPath = path.join(__dirname, year.toString(), '../../' + outputArg);

// Expected new measures
const expectedMeasures = require('../' + year + '/fixtures/expected-measures.json');

// Function which executes script and reads in output file to a JS object.
const runTest = function(measuresFile, measuresCsv) {
  const cmd = 'node ./scripts/measures/' + year + '/import-qcdr-measures.js ' +
    measuresFile + ' ' + measuresCsv + ' ' + qcdrStrataNamesFile + ' ' + outputArg;
  console.log(execSync(cmd, {stdio: 'pipe'}).toString());

  const qpp = fs.readFileSync(outputPath, 'utf8');

  return JSON.parse(qpp);
};

describe(year + ' import measures', function() {
  it('should create new measures and ignore duplicate measureIds', () => {
    const measures = runTest(testMeasures, testCsv);
    assert.equal(measures.length, 3);
  });

  it('should overwrite fields with the right csv data', () => {
    const measures = runTest(testMeasures, testCsv);
    expectedMeasures.forEach(function(expectedMeasure, measureIdx) {
      Object.entries(expectedMeasure).forEach(function([measureKey, measureValue]) {
        assert.deepEqual(measures[measureIdx][measureKey], measureValue);
      });
    });
  });

  it('should correctly identify multiPerformanceRate measures', () => {
    const measures = runTest(testMeasures, testCsv);
    const multiPerformanceRateMeasure = _.find(measures, {measureId: 'AAAAI4'});
    assert.equal(multiPerformanceRateMeasure.metricType, 'registryMultiPerformanceRate');
  });

  it('throws an informative error when the column doesn\'t exist', function() {
    const errorMessage = /Column 2 does not exist in source data/;
    // assert.throws expects a function as its first parameter
    const errFunc = () => {
      runTest(testMeasures, testCsv2Cols);
    };
    assert.throws(errFunc, Error, errorMessage);
  });

  it('throws an informative error when a value in the qcdr csv for an existing ' +
    'measureId conflicts with an existing measure', function() {
    const errorMessage = /conflicts with existing measure/;
    // assert.throws expects a function as its first parameter
    const errFunc = () => {
      runTest(testMeasures2, testCsv);
    };
    assert.throws(errFunc, Error, errorMessage);
  });
});

after(function() {
  try {
    fs.unlinkSync(outputPath);
  } catch (err) {
    console.log('Warning: ', outputPath, ' should have been deleted but was not.');
  }
});
