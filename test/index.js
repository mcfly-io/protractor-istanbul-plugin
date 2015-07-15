var assert = require('assert');
var chai = require('chai');
var sinon = require('sinon');
var Q = require('q');
var path = require('path');
var uuid = require('uuid');

var ProtractorIstanbulPlugin = require('../index');
var subject;
var result;

var expectedWrappedFunction = function () {
    return 'expected-result';
};
var expectedWrappedObject = {expectedWrappedFunction: expectedWrappedFunction};
expectedWrappedFunction.boundParent = expectedWrappedObject;
expectedWrappedFunction.boundName = "expectedWrappedFunction";

describe('protractor-istanbul-plugin', function () {
    describe('#constructor', function () {
        describe('with valid options', function () {
            describe('with all options provided', function () {
                beforeEach(function (done) {
                    sinon.spy(expectedWrappedObject, 'expectedWrappedFunction');
                    subject = new ProtractorIstanbulPlugin({
                        outputPath: "some/path",
                        functions: [expectedWrappedObject.expectedWrappedFunction]
                    });
                    // this will be implicitly available via protractor
                    subject.driver = {
                        executeScript: function () {
                        }
                    };
                    done();
                });
                it('should implement the postTest plugin function', function (done) {
                    assert.equal(subject.postTest instanceof Function, true);
                    done();
                });
                it('should implement the teardown plugin function', function (done) {
                    assert.equal(subject.teardown instanceof Function, true);
                    done();
                });
                it('should wrap the provided functions(s) in its preserveCoverage method', function (done) {
                    assert.equal(expectedWrappedObject.expectedWrappedFunction, subject.preserveCoverage);
                    done();
                });
                describe('#preserveCoverage', function () {
                    describe('when wrapped function called with any number of arguments', function () {
                        beforeEach(function (done) {
                            result = undefined;
                            sinon.stub(subject.driver, 'executeScript').returns(Q.resolve({coverage: 'object'}));
                            var promised = expectedWrappedObject.expectedWrappedFunction('first arg', 'second arg');
                            promised.then(function (output) {
                                result = output;
                                done();
                            });
                        });
                        it('preserves coverage by getting it from the page with its driver', function (done) {
                            sinon.assert.calledWith(subject.driver.executeScript, 'return __coverage__;');
                            done();
                        });
                        it('calls the wrapped function with those arguments', function (done) {
                            sinon.assert.calledWithMatch(expectedWrappedObject.expectedWrappedFunction.originalFunction, 'first arg', 'second arg');
                            done();
                        });
                        it('returns (via promise) whatever the wrapped function would have returned', function (done) {
                            assert.equal(result, 'expected-result');
                            done();
                        });
                        it('preserves coverage by setting it back to the page with its driver', function (done) {
                            sinon.assert.calledWith(subject.driver.executeScript, '__coverage__ = arguments[0];', {coverage: 'object'});
                            done();
                        });
                        afterEach(function (done) {
                            subject.driver.executeScript.restore();
                            done();
                        });
                    });
                });
                describe('#postTest', function () {
                    describe('when called as part of a protractor run', function () {
                        beforeEach(function (done) {
                            sinon.stub(uuid, 'v4').returns('whonko');
                            sinon.stub(console, 'log');
                            done();
                        });
                        describe('and everything goes as planned', function () {
                            beforeEach(function (done) {
                                sinon.stub(subject.driver, 'executeScript').returns(Q.resolve({coverage: 'object'}));
                                sinon.stub(subject.fs, 'outputJsonSync').returns(true);
                                var promised = subject.postTest();
                                promised.then(function (output) {
                                    result = output;
                                    done();
                                });
                            });
                            it('collects the coverage data from the page by calling its driver', function (done) {
                                sinon.assert.calledWith(subject.driver.executeScript, 'return __coverage__;');
                                done();
                            });
                            it('writes the coverage data to a file by calling its fs, using the output path and using a uuid for the file name', function (done) {
                                var expectedPath = path.join("some/path", 'whonko.json');
                                sinon.assert.calledWith(subject.fs.outputJsonSync, expectedPath);
                                done();
                            });
                            it('logs a success message vaguely indicating that it was successful and where it stored things', function (done) {
                                sinon.assert.calledWithMatch(console.log, /successfully.*?gathered.*?coverage.*?whonko\.json/i);
                                done();
                            });
                            afterEach(function (done) {
                                subject.driver.executeScript.restore();
                                subject.fs.outputJsonSync.restore();
                                done();
                            });
                        });
                        afterEach(function (done) {
                            uuid.v4.restore();
                            console.log.restore();
                            done();
                        });
                    });
                });
                afterEach(function (done) {
                    expectedWrappedObject = {expectedWrappedFunction: expectedWrappedFunction};
                    expectedWrappedFunction.boundParent = expectedWrappedObject;
                    expectedWrappedFunction.boundName = "expectedWrappedFunction";
                    done();
                });
            });
        });
        describe('with invalid options', function () {
            describe('with invalid outputPath option', function () {
                it('throws an exception stating that outputPath is invalid', function (done) {
                    chai.expect(function () {
                        subject = new ProtractorIstanbulPlugin({outputPath: undefined});
                    }).to.throw('ArgumentError');
                    done();
                })
            });
            describe('with invalid functions option', function () {
                describe('with functions option that is not an array', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: undefined});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions option that is not an array of functions', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [undefined]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions that do not have boundParent set', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        var badFunction = function () {
                        };
                        badFunction.boundName = "whatever";
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [badFunction]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
                describe('with functions that do not have boundName set', function () {
                    it('throws an exception stating that functions is/are invalid', function (done) {
                        var badFunction = function () {
                        };
                        badFunction.boundParent = {};
                        chai.expect(function () {
                            subject = new ProtractorIstanbulPlugin({functions: [badFunction]});
                        }).to.throw('ArgumentError');
                        done();
                    })
                });
            });
        });
    });
});