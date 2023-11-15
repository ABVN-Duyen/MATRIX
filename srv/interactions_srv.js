const cds = require('@sap/cds')

module.exports = cds.service.impl(function () {
    this.on('getOverlookingAnalysis', async (req) => {
        try {
            let client = req.data.client
            let client_item = req.data.client_item
            // let dbQuery = ` SELECT * FROM "APP_INTERACTIONS_INPUT_SAMPLE_MATRIX" WHERE CLIENT='${client}'`
            dbQuery = {
                SELECT: {
                    from: { ref: ["DB_OVERLOOKING_ANALYSIS"] },
                    where: [{ ref: ["CLIENT"] }, "=", { val: client }, 'and',
                    { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                    ]
                }
            }
            console.log(req.query)
            let result = await cds.run(dbQuery, {})
            return result
        } catch (error) {
            console.error(error)
            return false
        }
    }),

        this.on('getInputWithClient', async (req) => {
            try {
                let client = req.data.client
                // let dbQuery = ` SELECT * FROM "APP_INTERACTIONS_INPUT_SAMPLE_MATRIX" WHERE CLIENT='${client}'`
                dbQuery = {
                    SELECT: {
                        from: { ref: ["APP_INTERACTIONS_INPUT_SAMPLE_MATRIX"] },
                        where: [{ ref: ["CLIENT"] }, "=", { val: client }]
                    }
                }
                let result = await cds.run(dbQuery, {})
                return result
            } catch (error) {
                console.error(error)
                return false
            }
        }),
        this.on('upload', async (req) => {
            try {

                let body = req.data.uploadData
                let result = await this.run(INSERT.into('OVERLOOKING_ANALYSIS', body))

                await this.run(UPSERT.into('CLIENT_VIEW', {
                    CLIENTKEY: body[0].CLIENT,
                    CLIENT_ITEM: body[0].CLIENT_ITEM,
                    TITLE: body[0].CLIENT
                }))
                console.log(result)
            } catch (error) {
                console.error(error)
                return false
            }
        }),
        this.on('deleteClient', async (req) => {
            try {
                let client = req.data.client
                let client_item = req.data.client_item
                let dbQuery = {
                    DELETE: {
                        from: { ref: ["DB_CLIENT_VIEW"] },
                        where: [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                        { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                        ]
                    }
                }
                let result = await cds.run(dbQuery, {})
                return result
            } catch (error) {
                console.error(error)
                return false
            }
        }),

        this.on('updateClientsMaster', async (req) => {
            try {
                let body = req.data.clientline;
                let client = body[0].CLIENTKEY;
                let client_item = body[0].CLIENT_ITEM;
                let client_title = body[0].TITLE;
                let client_matrix = body[0].MATRIX;
                let client_chart = body[0].CHART;

                //Delete current Client + Client item
                let delClientQuery = {
                    DELETE: {
                        from: { ref: ["DB_CLIENT_VIEW"] },
                        where: [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                        { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                        ]
                    }
                }
                await cds.run(delClientQuery)

                if (client_chart != '') {
                    await this.run(UPSERT.into('CLIENT_VIEW', {
                        CLIENTKEY: client,
                        CLIENT_ITEM: client_item,
                        TITLE: client_title,
                        MATRIX: client_matrix,
                        CHART: client_chart
                    }))
                }


                // //Add new
                // await this.run(UPSERT.into('CLIENT_VIEW', {
                //     CLIENTKEY: body[0].CLIENTKEY,
                //     CLIENT_ITEM: body[0].CLIENT_ITEM,
                //     TITLE: body[0].TITLE,
                //     MATRIX:  body[0].MATRIX,
                //     CHART: body[0].CHART
                // }))

                return true

            } catch (error) {
                console.error(error)
                return false
            }
        }),

        this.on('deleteInputofClient', async (req) => {
            try {
                let client = req.data.client
                let client_item = req.data.client_item
                let aWhereExprDelete, aWhereExprSelect, aWhereExprDeleteClient

                if (client_item != 'undefined') {
                    aWhereExprDelete = [{ ref: ["CLIENT"] }, "=", { val: client }, 'and',
                    { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                    ]
                    // aWhereExprSelect = [{ ref: ["DB_SIGNIFICANT", "CLIENT"] }, "=", { val: client }, 'and',
                    // { ref: ["DB_SIGNIFICANT", "CLIENT_ITEM"] }, "=", { val: client_item }
                    // ]
                    aWhereExprSelect = [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                    { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                    ]
                    // aWhereExprDeleteClient = [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                    // { ref: ["CLIENT_ITEM"] }, "=", { val: client_item }
                    // ]
                } else {
                    aWhereExprDelete = [{ ref: ["CLIENT"] }, "=", { val: client }]
                    aWhereExprSelect = [{ ref: ["DB_CLIENT_VIEW", "CLIENTKEY"] }, "=", { val: client }]
                    // aWhereExprDeleteClient = [{ ref: ["CLIENTKEY"] }, "=", { val: client }]
                }

                // let significantSelect = {
                //     SELECT: {
                //         from: {
                //             join: 'inner',
                //             args: [{ ref: ["DB_SIGNIFICANT"] }, { ref: ["DB_CLIENT_VIEW"] }],
                //             on: [{ ref: ["DB_SIGNIFICANT", "CLIENT"] }, "=", { ref: ["DB_CLIENT_VIEW", "CLIENTKEY"] }, 'and',
                //             { ref: ["DB_SIGNIFICANT", "CLIENT_ITEM"] }, "=", { ref: ["DB_CLIENT_VIEW", "CLIENT_ITEM"] }
                //             ]
                //         },
                //         columns: [
                //             { ref: ["DB_SIGNIFICANT", "CLIENT"] },
                //             { ref: ["DB_SIGNIFICANT", "CLIENT_ITEM"] },
                //             { ref: ["DB_CLIENT_VIEW", "CHART"] } //New
                //         ],
                //         where: aWhereExprSelect
                //     }
                // }

                let clientViewSelect = {
                    SELECT: {
                        from: {ref: ["DB_CLIENT_VIEW"] },
                        where: aWhereExprSelect
                    }
                }

                // Delete input from DB_OVERLOOKING_ANALYSIS
                let dbQuery = {
                    DELETE: {
                        from: { ref: ["DB_OVERLOOKING_ANALYSIS"] },
                        where: aWhereExprDelete
                    }
                }
                await cds.run(dbQuery, {})

                //Thai Add
                // let oClientMaster = await this.send('fetchClientMaster', { client: client })
                // console.log(oClientMaster)

                //Delete Client from DB_CLIENT_VIEW
                let db_cl_view = await cds.run(clientViewSelect)
                console.log(db_cl_view)
                let aQuery, aWhereCondition
                // if (db_cl_view.length != 0) {
                for (let i = 0; i < db_cl_view.length; i++) {
                    if (db_cl_view[i].CHART == null || db_cl_view[i].CHART == "") {
                        aWhereCondition = [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                        { ref: ["CLIENT_ITEM"] }, "=", { val: db_cl_view[i].CLIENT_ITEM }]
                        aQuery = {
                            DELETE: {
                                from: { ref: ["DB_CLIENT_VIEW"] },
                                where: aWhereCondition
                            }
                        }
                    } else {
                        aWhereCondition = [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                        { ref: ["CLIENT_ITEM"] }, "=", { val: db_cl_view[i].CLIENT_ITEM }]

                        aQuery = {
                            UPDATE: {
                                entity: { ref: ["DB_CLIENT_VIEW"] },
                                data: { MATRIX: "" },
                                where: aWhereCondition
                            }
                        }
                    }
                    await cds.run(aQuery)
                }
                // delClientQuery = {
                //     DELETE: {
                //         from: { ref: ["DB_CLIENT_VIEW"] },
                //         where: aWhereExprDeleteClient
                //     }
                // }
                // await cds.run(delClientQuery)
                // } 
                // else {
                //     let client_existed
                //     if (client_item != 'undefined') {
                //         client_existed = db_cl_view.find(element => {
                //             element.CLIENT == client && element.CLIENT_ITEM == client_item
                //         })
                //         if (!client_existed) {
                //             delClientQuery = {
                //                 DELETE: {
                //                     from: { ref: ["DB_CLIENT_VIEW"] },
                //                     where: aWhereExprDeleteClient
                //                 }
                //             }
                //             await cds.run(delClientQuery)
                //         }
                //     } else {
                //         db_cl_view.foreach(async element => {
                //             delClientQuery = {
                //                 DELETE: {
                //                     from: { ref: ["DB_CLIENT_VIEW"] },
                //                     where: [{ ref: ["CLIENTKEY"] }, "=", { val: client }, 'and',
                //                     { ref: ["CLIENT_ITEM"] }, "!=", { val: element.CLIENT_ITEM }
                //                     ]
                //                 }
                //             }
                //             await cds.run(delClientQuery)
                //         })
                //     }
                // }
                return true
            } catch (error) {
                console.error(error)
                return false
            }
        }),
        this.on('fetchClients', async req => {
            let dbQuery = {
                SELECT: {
                    distinct: true,
                    from: { ref: ["DB_OVERLOOKING_ANALYSIS"] },
                    columns: [
                        { ref: ["CLIENT"] },
                        { ref: ["CLIENT_ITEM"] }
                    ]
                }
            }
            let result = await cds.run(dbQuery)
            // let groupedClient = {}
            // result.forEach(element => {
            //     if(!groupedClient[element.CLIENT]) groupedClient[element.CLIENT] = [element]
            //     else groupedClient[element.CLIENT].push(element) 
            // });
            // console.log(groupedClient)
            return result
        }),
        this.on('fetchClientsFromSignificant', async req => {
            let dbQuery = {
                SELECT: {
                    distinct: true,
                    from: { ref: ["DB_SIGNIFICANT"] },
                    columns: [
                        { ref: ["CLIENT"] },
                        { ref: ["CLIENT_ITEM"] }
                    ]
                }
            }
            let result = await cds.run(dbQuery)
            return result
        }),

        this.on('fetchClientsMaster', async (req) => {
            try {
                let client = req.data.client
                let client_item = req.data.client_item
                let dbQuery = `SELECT * FROM "GRAPH_HDI_GRAPH_DB_DEPLOYER_1"."DB_CLIENT_VIEW" WHERE "CLIENTKEY" = '${client}' '`
                let result = await cds.run(dbQuery, {})
                console.log(result)

                return result
            } catch (error) {
                console.error(error)
                return false
            }

        }),

        this.on('fetchClientsItemMaster', async (req) => {
            try {
                let client = req.data.client
                let client_item = req.data.client_item
                let dbQuery = `SELECT * FROM "GRAPH_HDI_GRAPH_DB_DEPLOYER_1"."DB_CLIENT_VIEW" WHERE "CLIENTKEY" = '${client}' AND "CLIENT_ITEM" = '${client_item}'`
                let result = await cds.run(dbQuery, {})
                console.log(result)

                return result
            } catch (error) {
                console.error(error)
                return false
            }

        })

})