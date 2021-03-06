// import { beforeEach, describe, expect, it } from './lib/common';
import TemplateSrvStub from './lib/TemplateSrvStub';
import {Datasource} from '../src/module';
import q from 'q';
import {beforeEach, describe, expect, it} from "./lib/common";

describe('ConsulDatasource', () => {
    const ctx: any = {
        backendSrv: {},
        templateSrv: new TemplateSrvStub(),
    };

    beforeEach(() => {
        ctx.$q = q;
        ctx.ds = new Datasource({}, ctx.$q, ctx.backendSrv, ctx.templateSrv);
        ctx.ds.debug = true;
    });

    it('query should return an empty array when no targets are set', (done) => {
        ctx.ds.query({targets: []}).then((result) => {
            expect(result.data).toHaveLength(0);
            done();
        });
    });

    it('query should return the server timeseries results when a target is set', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                data: {
                    results: {
                        "test": {
                            refId: "test",
                            series:
                                [{
                                    name: 'X1',
                                    points: [1, 2, 3],
                                },
                                {
                                    name: 'X2',
                                    points: [1, 2, 3],
                                },
                                {
                                    name: 'X3',
                                    points: [1, 2, 3],
                                }]
                        }
                    }
                }
            });
        };

        ctx.templateSrv.replace = function (data) {
            return data;
        };

        ctx.ds.query({
                targets: [{
                    target: 'hits',
                    refId: 'test'
                }],
                range: {
                    from: new Date(2012, 4, 1),
                    to: new Date(2018, 4, 1)
                }
            }
        ).then((result) => {
            expect(result._request.data.queries).toHaveLength(1);

            expect(result.data).toHaveLength(3);

            expect(result.data[0].target).toBe('X1');
            expect(result.data[0].datapoints).toHaveLength(3);
            expect(result.data[1].target).toBe('X2');
            expect(result.data[1].datapoints).toHaveLength(3);
            expect(result.data[2].target).toBe('X3');
            expect(result.data[2].datapoints).toHaveLength(3);
            done();
        });
    });

    it('query should return the server timeseries results when a target is set and evaluate legendFormat', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                data: {
                    results: {
                        "test": {
                            refId: "test",
                            series:
                                [{
                                    name: 'X',
                                    points: [1, 2, 3],
                                    tags: {
                                        name: "testName"
                                    }
                                },]
                        }
                    }
                }
            });
        };

        ctx.templateSrv.replace = function (data) {
            return data;
        };

        ctx.ds.query({
                targets: [{
                    target: 'hits',
                    refId: 'test',
                    legendFormat: "{{ name }}"
                },
                    {
                        target: 'hits2',
                        hide: true,
                    }],
                range: {
                    from: new Date(2012, 4, 1),
                    to: new Date(2018, 4, 1)
                }
            }
        ).then((result) => {
            expect(result._request.data.queries).toHaveLength(1);

            const series = result.data[0];
            expect(series.target).toBe('testName');
            expect(series.datapoints).toHaveLength(3);
            done();
        });
    });

    it('query should return the server table results when a target is set', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                data: {
                    results: {
                        "test": {
                            refId: "test",
                            tables:
                                [{
                                    columns: [{name: "columnName"}],
                                    rows: [{values: [{kind: 4, stringValue: "v1."}]}]
                                },]
                        }
                    }
                }
            });
        };
        ctx.templateSrv.replace = function (data) {
            return data;
        };

        ctx.ds.query({
            targets: [{
                target: 'hits',
                refId: 'test'
            }]
        })
            .then((result) => {
                expect(result._request.data.queries).toHaveLength(1);

                const table = result.data[0];
                expect(table.type).toBe('table');
                expect(table.columns).toHaveLength(1);
                expect(table.rows).toHaveLength(1);
                done();
            });
    });

    it('renderTemplate should render a template', (done) => {
        const rendered = ctx.ds.renderTemplate("{{ version }} {{ unknown }}", {version: "1.0"});

        expect(rendered).toBe("1.0 unknown");
        done();
    });

    it('testDatasource should return success if test works', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                status: 200,
                data: {}
            });
        };
        ctx.ds.testDatasource().then((result) => {
            expect(result.status).toBe('success');
            done();
        });
    });

    it('testDatasource should return error if test did not work', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                status: 401,
                data: {}
            });
        };
        ctx.ds.testDatasource().then((result) => {
            expect(result.status).toBe('error');
            done();
        });
    });

    it('metricFindQuery should return results', (done) => {
        ctx.backendSrv.datasourceRequest = function (request) {
            return ctx.$q.when({
                _request: request,
                data: {
                    results: {
                        "keys": {
                            refId: "keys",
                            series: [{
                                name: "apiVersion",
                                points: [{
                                    value: 1
                                }]
                            }]
                        }
                    }
                }
            })
        };
        ctx.templateSrv.replace = function (data) {
            return data;
        };
        ctx.ds.metricFindQuery("registry/").then((result) => {
            expect(result).toHaveLength(1);
            expect(result[0].text).toBe('apiVersion');
            expect(result[0].value).toBe('apiVersion');
            done();
        });
    });

});
