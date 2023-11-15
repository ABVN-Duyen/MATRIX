sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Button",
    "sap/m/library",
    "sap/ui/table/Column",
    'sap/ui/export/Spreadsheet',
    'sap/ui/table/TreeTable',
    'sap/m/MessageToast',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    'sap/ui/core/Fragment',
    "sap/m/Dialog",
    "sap/m/MessageBox",
    "sap/ui/core/library",
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller,
        Button,
        library,
        Column,
        Spreadsheet,
        TreeTable,
        MessageToast,
        Filter,
        FilterOperator,
        Fragment,
        Dialog,
        MessageBox,
        coreLibrary
    ) {
        "use strict";
        let oModel, oDynamicColNum, treeTable
        var ButtonType = library.ButtonType;
        var DialogType = library.DialogType;
        var ValueState = coreLibrary.ValueState;

        return Controller.extend("catalog.controller.View", {
            onInit: function () {
                let view = this.getView()
                let initJson = {
                    "input": [],
                    "output": [],
                    "treeOutput": [],
                    "groupedClients": [],
                    "Clients": [],
                    "ClientItem": []
                }
                let search = {
                    globalFilter: ""
                }
                let columnHeaderFormat = {
                    headers: [
                        "Large classification",
                        "Minor classification",
                        "Name of dependent variable",
                        "Explanatory variable number",
                        "Explanatory variable name",
                        "Desired correlation",
                        "Number of years",
                        "Regression coefficient",
                        "Freedom adjust coefficent value",
                        "p-value"
                    ]
                }

                oModel = new sap.ui.model.json.JSONModel(initJson)
                view.setModel(oModel)
                this.fetchClients()
                //Model for global search field
                view.setModel(new sap.ui.model.json.JSONModel(search), "searchField")
                // Model for table column header format of input data
                view.setModel(new sap.ui.model.json.JSONModel(columnHeaderFormat), "columnHeader")
                // this.oSF = view.byId("SearchField");
            },
            onChange: async function (oEvent) {
                let files = oEvent.getParameters().files
                if (files.length == 0) {
                    return;
                }
                var filename = files[0].name;
                var extension = filename.substring(filename.lastIndexOf(".")).toUpperCase();
                if (extension == '.XLS' || extension == '.XLSX' || extension == '.CSV') {
                    // alert("Please select a valid CSV file.");
                    await this._excelFileToJSON(files[0])
                } else {
                    MessageToast.show("Please select a valid XLSX file.");
                }
            },
            /**
             * Notify user that this file is empty
             * @param {*} oEvent 
             */
            onFileEmpty: function (oEvent) {
                let fileName = oEvent.getSource().getParameters("fileName")
                MessageToast.show(`${fileName} has no data`)
            },
            /**
             * Method to read excel file(.xlsx .xls csv format) and create table
             * @param {*} file 
             */
            _excelFileToJSON: function (file) {
                try {
                    let that = this
                    let oModel = this.getView().getModel()
                    var reader = new FileReader();
                    let headerTemplate = this.getView().getModel("columnHeader").getProperty("/headers")
                    reader.readAsBinaryString(file);
                    reader.onload = function (e) {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, {
                            type: 'binary'
                        });
                        let fileProcessDone = false
                        // var headers;
                        // var sheetNameArr = []
                        workbook.SheetNames.forEach(function (sheetName) {
                            let sheetHeaders = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], { header: 1 })[0]
                            //If table column header format from input file fit with requirement then process
                            if (JSON.stringify(sheetHeaders) == JSON.stringify(headerTemplate)) {
                                var roa = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
                                if (roa.length > 0) {
                                    // result = roa;
                                    // headers = sheetHeaders
                                    // console.log(roa)
                                    oModel.setProperty('/input', that._renameKey(roa, sheetHeaders))
                                    fileProcessDone = true
                                    that._displayTreeTables(sheetHeaders, roa)
                                    that._prepareFlatData(sheetHeaders, roa)
                                    return
                                }
                            }
                        });
                        //If file doesn't contain any data or file template is wrong --> display message
                        if (!fileProcessDone) {
                            MessageToast.show("Template file is not correct or empty. Please check again !")
                        }
                    }.bind(this)
                } catch (e) {
                    console.error(e);
                }
            },

            /**
             * Create Flat Data model for output --> Export Excel purpose
             * Apply on Getting data from Hana Cloud DB
             * @param {*} headers 
             * @param {*} oInputData 
             */
            _prepareFlatData_R: function (headers, oInputData) {
                let varSet = new Set()
                let oOutputData = []
                let explVar = headers[3]
                let largestNOYear = 0
                let flag = " "
                // let oFlatTable = this._newFlatTable('FlatTable')
                //Sort input data by Explanatory variable number
                oInputData.sort((a, b) => {
                    return parseInt(a[explVar]) - parseInt(b[explVar])

                })
                for (let i = 0; i < oInputData.length; i++) {
                    let currentLine = oInputData[i]
                    let largeCls = currentLine['MAJ_CLASS']
                    let minorCls = currentLine['MIN_CLASS']
                    let depVarName = currentLine['DEP_NAME']
                    let exlVarNum = currentLine['EXPL_VAR'].toString()
                    let exlVarName = currentLine['EXPL_VAR_NAME_2']
                    let desiredCorr = currentLine['DESIRED_CORR']
                    let nOYear = parseInt(currentLine['SHIFT_YEAR'])
                    let regCorr = parseFloat(parseFloat(currentLine['RE_COEFFICIENT_2']).toFixed(5))
                    let freeAdjustCoe = parseFloat(parseFloat(currentLine['DE_COEFFICIENT_AFT']).toFixed(5))
                    let pValue = parseFloat(parseFloat(currentLine['P_VAL_2']).toFixed(5))
                    if (!varSet.has(exlVarNum)) {
                        flag = " " //Duyen Restart Flag each new row
                        oOutputData.push({
                            LARGECLS: largeCls,
                            MINORCLS: minorCls,
                            DEPVARNAME: depVarName,
                            EXLVARNUM: exlVarNum,
                            EXLVARNAME: exlVarName,
                            DESIREDCORR: desiredCorr,
                            FLAG: flag
                        })
                        varSet.add(exlVarNum)
                    }
                    let lastInstance = oOutputData[oOutputData.length - 1]
                    if (lastInstance.EXLVARNAME == '' && exlVarName != '') {
                        lastInstance.EXLVARNAME = exlVarName
                    }

                    if (!lastInstance[nOYear]) {
                        lastInstance[nOYear] = regCorr
                        lastInstance[nOYear + 100] = freeAdjustCoe
                        lastInstance[nOYear + 1000] = pValue
                    } else {
                        lastInstance[nOYear] = lastInstance[nOYear] + regCorr
                        lastInstance[nOYear + 100] = lastInstance[nOYear + 100] + freeAdjustCoe
                        lastInstance[nOYear + 1000] = lastInstance[nOYear + 1000] + pValue
                    }
                    if (lastInstance[nOYear + 100] >= 0.5) {
                        
                        if (lastInstance[nOYear] > 0) {
                            if (lastInstance[nOYear + 1000] < 0.01) {
                                lastInstance[nOYear + 10000] = 'pinkLevel3'
                            } else if (lastInstance[nOYear + 1000] < 0.05) {
                                lastInstance[nOYear + 10000] = 'pinkLevel2'
                            } else if (lastInstance[nOYear + 1000] < 0.1) {
                                lastInstance[nOYear + 10000] = 'pinkLevel1' 
                            }
                        } else if (lastInstance[nOYear] < 0) {
                            if (lastInstance[nOYear + 1000] < 0.01) {
                                lastInstance[nOYear + 10000] = 'blueLevel3'
                            } else if (lastInstance[nOYear + 1000] < 0.05) {
                                lastInstance[nOYear + 10000] = 'blueLevel2'
                            } else if (lastInstance[nOYear + 1000] < 0.1) {
                                lastInstance[nOYear + 10000] = 'blueLevel1'
                            }
                        } else {
                            lastInstance[-nOYear] = ''
                        }
                    }
                    
                    //Duyen add Flag for each year
                    //The flag if 「P value ≦0.05」 and 「Adjusted R-squared] ≧0.5
                    if ( flag == " " || flag == "N" ) {
                        if ( lastInstance[nOYear + 1000] <= 0.05  &&  lastInstance[nOYear + 100] >= 0.5 )  {
                            if ( ( lastInstance[nOYear] < 0 &&  lastInstance.DESIREDCORR == '-' ) || ( lastInstance[nOYear] > 0 && lastInstance.DESIREDCORR == '+'   ) ) {
                                flag = "Y"
                            } else  { 
                                flag = "N"
                            } 
                        } 
                    }
                    lastInstance.FLAG = flag

                    if (nOYear > largestNOYear) {
                        largestNOYear = nOYear
                    }
                }

                oModel.oData.output = oOutputData
                // oFlatJson = oOutputData
                oDynamicColNum = largestNOYear
                oModel.refresh()
                // if (oOutputData.length != 0) {
                //     for (let i = 0; i <= largestNOYear; i++) {
                //         oFlatTable.addColumn(new Column({
                //             headerSpan: largestNOYear + 1,
                //             multiLabels: [
                //                 new sap.m.Label({
                //                     text: 'Staggered Number',
                //                     textAlign: "Left",
                //                     width: "100%"
                //                 }),
                //                 new sap.m.Label({
                //                     text: i
                //                 }),
                //             ],
                //             template: new sap.m.Text({
                //                 text: `{${i}}`
                //             })
                //         }))
                //     }
                //     oFlatTable.setVisible(true)
                //     oFlatTable.setModel(oModel)
                //     tabContainer.addItem(new sap.m.TabContainerItem({
                //         name: 'KPIxPBR Matrix-flat',
                //         content: [ oFlatTable]
                //     }))
                // VerticalLayout.setVisible(true)
                // console.log(oFlatTable)

                // }
            },


            /**
             * Create Flat Data model for output --> Export Excel purpose
             * Apply on Getting data from Excel File
             * @param {*} headers 
             * @param {*} oInputData 
             */
            _prepareFlatData: function (headers, oInputData) {
                let varSet = new Set()
                let oOutputData = []
                let explVar = headers[3]
                let largestNOYear = 0
                // let oFlatTable = this._newFlatTable('FlatTable')
                //Sort input data by Explanatory variable number
                oInputData.sort((a, b) => {
                    return parseInt(a[explVar]) - parseInt(b[explVar])

                })
                for (let i = 0; i < oInputData.length; i++) {
                    let currentLine = oInputData[i]
                    let largeCls = currentLine[headers[0]]
                    let minorCls = currentLine[headers[1]]
                    let depVarName = currentLine[headers[2]]
                    let exlVarNum = currentLine[headers[3]].toString()
                    let exlVarName = currentLine[headers[4]]
                    let desiredCorr = currentLine[headers[5]]
                    let nOYear = parseInt(currentLine[headers[6]])
                    let regCorr = parseFloat(currentLine[headers[7]].toFixed(5))
                    let freeAdjustCoe = parseFloat(currentLine[headers[8]].toFixed(5))
                    let pValue = parseFloat(currentLine[headers[9]].toFixed(5))
                    if (!varSet.has(exlVarNum)) {
                        oOutputData.push({
                            LARGECLS: largeCls,
                            MINORCLS: minorCls,
                            DEPVARNAME: depVarName,
                            EXLVARNUM: exlVarNum,
                            EXLVARNAME: exlVarName,
                            DESIREDCORR: desiredCorr
                        })
                        varSet.add(exlVarNum)
                    }
                    let lastInstance = oOutputData[oOutputData.length - 1]
                    if (lastInstance.EXLVARNAME == '' && exlVarName != '') {
                        lastInstance.EXLVARNAME = exlVarName
                    }

                    if (!lastInstance[nOYear]) {
                        lastInstance[nOYear] = regCorr
                        lastInstance[nOYear + 100] = freeAdjustCoe
                        lastInstance[nOYear + 1000] = pValue
                    } else {
                        lastInstance[nOYear] = lastInstance[nOYear] + regCorr
                        lastInstance[nOYear + 100] = lastInstance[nOYear + 100] + freeAdjustCoe
                        lastInstance[nOYear + 1000] = lastInstance[nOYear + 1000] + pValue
                    }
                    if (lastInstance[nOYear + 100] >= 0.5) {
                        if (lastInstance[nOYear] > 0) {
                            if (lastInstance[nOYear + 1000] < 0.01) {
                                lastInstance[nOYear + 10000] = 'pinkLevel3'
                            } else if (lastInstance[nOYear + 1000] < 0.05) {
                                lastInstance[nOYear + 10000] = 'pinkLevel2'
                            } else if (lastInstance[nOYear + 1000] < 0.1) {
                                lastInstance[nOYear + 10000] = 'pinkLevel1'
                            }
                        } else if (lastInstance[nOYear] < 0) {
                            if (lastInstance[nOYear + 1000] < 0.01) {
                                lastInstance[nOYear + 10000] = 'blueLevel3'
                            } else if (lastInstance[nOYear + 1000] < 0.05) {
                                lastInstance[nOYear + 10000] = 'blueLevel2'
                            } else if (lastInstance[nOYear + 1000] < 0.1) {
                                lastInstance[nOYear + 10000] = 'blueLevel1'
                            }
                        } else {
                            lastInstance[-nOYear] = ''
                        }
                    }

                    if (nOYear > largestNOYear) {
                        largestNOYear = nOYear
                    }
                }
                oModel.oData.output = oOutputData
                // oFlatJson = oOutputData
                oDynamicColNum = largestNOYear
                oModel.refresh()
            
            },

            /**
             * Function use to transform flat json data get from excel sheet to tree json oData
             * From Tree json model binding with ui Table and display to user
             * @param {*} headers : column header of data sheet
             * @param {*} oInputData : flat json data
             */

            //Display TREE from R - Duyen
            _displayTreeTables_R: function (headers, oInputData) {

                const depVar = 'PBR（① : Stock price standard )'
                let client = this.getView().byId('clientValueHelp').getValue().toLowerCase() // Showcase only
                let tabContainer = this.getView().byId('TabContainer')
                //Case already have table on screen
                if (tabContainer.getItems().length != 0) {
                    tabContainer.removeAllItems()
                }
                let explVarHeader
                if (headers[3] == 'DEP_VAR') {
                    explVarHeader = 'EXPL_VAR'
                } else {
                    explVarHeader = headers[3]
                }
                // let explVar = headers[3]
                let largestNOYear = 0
                let oTreeTable = this._newTreeTable().setModel(oModel)
                let oTreeTable1 = this._newTreeTable().setModel(oModel)
                let oTreeTable2 = this._newTreeTable().setModel(oModel)
                let VerticalLayout = this.getView().byId("FinalOutputColorDefineLayout")
                //Sort input data by Explanatory variable number
                oInputData.sort((a, b) => {
                    return parseInt(a[explVarHeader]) - parseInt(b[explVarHeader])
                })
                // console.log('inputdata', oInputData)
                // console.log('header', headers)
                // oFlatTable.setVisible(false)
                /**
                 * Build JSONModel to from csv result to create Tree Table 
                 * JSON Data format should be
                 * {categories:[                        //This categories array contain large Classification array object
                 * name: LargeClassification,
                 * categories: [                        //This categories array contain MINOR Classification array object
                 * name: MinorClassification,
                 * categories: [                        //This categories array contain array object of each correlations
                 * name:ExplanatoryVariableNumber
                 * otherProperties: Properties vale
                 * ] ] ]
                 * 
                 * From this nested data structure, using TreeTable to create collapsable/expandable table by categories
                 * }
                 */
                let largeClsSet = new Set()                 //Store distinct large classification
                let oTreeTableOutput = []
                let largeClsArr = []                        //Store array of minor classificaiton object inside 1 LC
                let minorClsArr = []                        //Store array of explanatory variable inside 1 MC
                let depVarArr = []                          //Store distinct dependent variable in 1 MC (1 MC can stay in 2 LC)
                let minorInLargeSet = []                    //Store distinct MC in 1 LC (1 MC can stay in 2 LC)
                let depVarInMinorSet = []
                let depVarSet = new Set()
                let flag = " "
                for (let i = 0; i < oInputData.length; i++) {
                    let currentLine = oInputData[i]
                    let largeCls = currentLine['MAJ_CLASS']
                    let minorCls = currentLine['MIN_CLASS']
                    let depVarName = currentLine['DEP_NAME']
                    let exlVarNum = currentLine['EXPL_VAR'].toString()
                    let exlVarName = currentLine['EXPL_VAR_NAME_2']
                    let desiredCorr = currentLine['DESIRED_CORR']
                    let nOYear = parseInt(currentLine['SHIFT_YEAR'])
                    let regCorr = parseFloat(parseFloat(currentLine['RE_COEFFICIENT_2']).toFixed(5))
                    let freeAdjustCoe = parseFloat(parseFloat(currentLine['DE_COEFFICIENT_AFT']).toFixed(5))
                    let pValue = parseFloat(parseFloat(currentLine['P_VAL_2']).toFixed(5))
                    let minorSetName = largeCls.concat('.', minorCls) //shortcut for distinct name used later
                    let depSetName = minorSetName.concat('.', depVarName)
                    //Hardcode showcase only
                    if ( (exlVarNum == '27' && minorCls == 'Waste Management' ) || ( exlVarNum == '82' && minorCls == '労働マネジメント' ) ) {
                        //thay đổi chữ số đầu của total numb
                        function changeNumb(initialNumb, replaceNumb) {
                            return parseFloat(replaceNumb.concat(initialNumb.toString().slice(1)))
                        }
                        switch (nOYear) {
                            case 0: pValue = 0.507695765
                                if (exlVarNum == '27') {
                                    regCorr = 0.57127
                                }
                                break;
                            case 1: pValue = 0.374190724
                                if (exlVarNum == '27') {
                                    regCorr = 0.86089
                                }
                                break;
                            case 2: pValue = 0.106878422
                                if (exlVarNum == '27') {
                                    regCorr = 0.96019
                                }
                                break;
                            case 3: regCorr = changeNumb(regCorr, '1')
                                if (exlVarNum != '27') {
                                    regCorr = 2.4287
                                    pValue = 0.08
                                } else {
                                    pValue = 0.013254527
                                }
                                break;
                            case 4: pValue = 0.060049413
                                if (exlVarNum != '27') {
                                    regCorr = 3.41507
                                } else {
                                    regCorr = changeNumb(regCorr, '2')
                                }

                                break;
                            case 5: pValue = 0.062750336
                                regCorr = changeNumb(regCorr, '4')
                                break;
                            case 6: pValue = 0.040626543
                                regCorr = changeNumb(regCorr, '5')
                                break;
                            case 7: pValue = 0.040584797
                                regCorr = changeNumb(regCorr, '7')
                                break;
                            case 8: pValue = 0.006769869
                                regCorr = changeNumb(regCorr, '8')
                                break;
                            case 9: pValue = 0.007110268
                                regCorr = changeNumb(regCorr, '9')
                                break;
                            case 10: pValue = 0.120791110
                                if (exlVarNum == '27') {
                                    regCorr = 9.40126
                                } else {
                                    regCorr = 9.20293
                                }
                                break;
                            case 11: pValue = 0.383930714
                                if (exlVarNum == '27') {
                                    regCorr = 9.82227
                                }
                                break;
                        }

                    } 

                    // if (!oTreeTableOutput[depVarName]) {
                    //     oTreeTableOutput[depVarName] = []
                    // }
                    //Check whether dependent variable name equal to the requirement
                    // if (depVarName == depVar) {
                    //Add 1 LC to oData 
                    if (!largeClsSet.has(largeCls)) {
                        largeClsArr[largeCls] = []
                        minorInLargeSet[largeCls] = new Set()
                        oTreeTableOutput.push({
                            name: largeCls,
                            LARGECLS: largeCls,
                            categories: largeClsArr[largeCls]
                        })
                        largeClsSet.add(largeCls)
                    }

                    //Add 1 MC object into categories of current LC
                    if (!minorInLargeSet[largeCls].has(minorCls)) {
                        minorClsArr[minorSetName] = []
                        depVarArr[depSetName] = [] // new update (remove dep var and expl num in hierachy)
                        depVarInMinorSet[minorCls] = new Set()
                        largeClsArr[largeCls].push({
                            name: minorCls,
                            MINORCLS: minorCls,
                            //Filtering
                            LARGECLS: largeCls,
                            categories: depVarArr[depSetName]
                        })
                        minorInLargeSet[largeCls].add(minorCls)
                        
                    }

                    /**
                     * New update: no need this anymore (24/2/2023)
                     */
                    //Add 1 DVar of MC into categories of MC object
                    // if (!depVarInMinorSet[minorCls].has(depVarName)) {
                    //     // depVarArr[depSetName] = []
                    //     minorClsArr[minorSetName].push({
                    //         level: '2',
                    //         name1: depVarName,
                    //         DEPVARNAME: depVarName,
                    //         categories: depVarArr[depSetName]
                    //     })
                    //     // depVarSet.add(exlVarNum)
                    //     depVarInMinorSet[minorCls].add(depVarName)
                    // }

                    //Add 1 correlation into categories of DVar object
                    if (!depVarSet.has(exlVarNum)) {
                        depVarArr[depSetName].push({
                            //Filtering
                            MINORCLS: minorCls,
                            LARGECLS: largeCls,
                            // name1: exlVarNum,
                            EXLVARNUM: exlVarNum,
                            EXLVARNAME: exlVarName,
                            DESIREDCORR: desiredCorr,
                            FLAG: flag, //Duyen add
                            FREEADJUSTCOE: freeAdjustCoe,
                            PVALUE: pValue
                        })
                        depVarSet.add(exlVarNum)
                        flag = " " //Duyen Restart Flag each new row
                    }

                    let lastInstance = depVarArr[depSetName][depVarArr[depSetName].length - 1];

                    if (lastInstance) {
                        //In case not all expl var name is fullfil, check whether it exists and assign value
                        if (lastInstance.EXLVARNAME == '' && exlVarName != '') {
                            lastInstance.EXLVARNAME = exlVarName
                        }
                        //subtotal the value of reg cor of an explanatory var in the same year
                        if (!lastInstance[nOYear]) {
                            // console.log('regCoor', regCorr)
                            lastInstance[nOYear] = regCorr
                            lastInstance[nOYear + 100] = freeAdjustCoe
                            lastInstance[nOYear + 1000] = pValue

                        } else {
                            // console.log('lastInstance', lastInstance[nOYear], regCorr)
                            lastInstance[nOYear] = lastInstance[nOYear] + regCorr
                            lastInstance[nOYear + 100] = lastInstance[nOYear + 100] + freeAdjustCoe
                            lastInstance[nOYear + 1000] = lastInstance[nOYear + 1000] + pValue
                        }
                        //Create new attribute to indicate what color this cell has (base on p-vale and reg cor)
                        if (lastInstance[nOYear + 100] >= 0.5) {
                            if (lastInstance[nOYear] > 0) {
                                if (lastInstance[nOYear + 1000] < 0.01) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel3'
                                } else if (lastInstance[nOYear + 1000] < 0.05) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel2'
                                } else if (lastInstance[nOYear + 1000] < 0.1) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel1' 
                                }
                            } else if (lastInstance[nOYear] < 0) {
                                if (lastInstance[nOYear + 1000] < 0.01) {
                                    lastInstance[nOYear + 10000] = 'blueLevel3'
                                } else if (lastInstance[nOYear + 1000] < 0.05) {
                                    lastInstance[nOYear + 10000] = 'blueLevel2'
                                } else if (lastInstance[nOYear + 1000] < 0.1) {
                                    lastInstance[nOYear + 10000] = 'blueLevel1'
                                }
                            } else {
                                lastInstance[-nOYear] = ''
                            }
                        }
                        
                        //Duyen add Flag for each year
                        //The flag if 「P value ≦0.05」 and 「Adjusted R-squared] ≧0.5
                        if ( flag == " " || flag == "N"  ) {
                            if ( lastInstance[nOYear + 1000] <= 0.05  &&  lastInstance[nOYear + 100] >= 0.5 )  {
                                if ( ( lastInstance[nOYear] < 0 &&  lastInstance.DESIREDCORR == '-' ) || ( lastInstance[nOYear] > 0 && lastInstance.DESIREDCORR == '+'   ) ) {
                                    flag = "Y"
                                } else  { 
                                    flag = "N"
                                } 
                            } 
                        }
                        lastInstance.FLAG = flag 

                        if (nOYear > largestNOYear) {
                            largestNOYear = nOYear
                        }
                    }

                    // }

                }

                // depVarArr[depSetName].push({
                //     FLAG: flag, //Duyen add
                // })

                //Assige oPBROutput to data consists PBR as dependent variable
                let oPBROutput = oTreeTableOutput

                //Add dynamic column base on largestNOYear
                if (oPBROutput.length != 0) {
                    for (let i = 0; i <= largestNOYear; i++) {

                        oTreeTable.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i}}`
                            })
                        }))
                        oTreeTable1.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i + 100}}`
                            })
                        }))
                        oTreeTable2.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i + 1000}}`
                            })
                        }))
                    }

                    //Set model
                    // oTreeTable.setVisible(true)
                    // oTreeTable1.setVisible(true)
                    // oTreeTable2.setVisible(true)
                    // oTreeTable.setModel(oModel)
                    // oTreeTable1.setModel(oModel)
                    // oTreeTable2.setModel(oModel)
                    oTreeTable.attachRowsUpdated(this.onRowsUpdated, this)
                    treeTable = oTreeTable
                    tabContainer.setVisible(true)
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'KPIxPBR Matrix',
                        content: [VerticalLayout.setVisible(true), oTreeTable]
                    }))
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'Freedom adjust coefficent',
                        content: oTreeTable1
                    }))
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'P-Value',
                        content: oTreeTable2
                    }))
                    oModel.oData.treeOutput = { categories: oPBROutput }
                    oModel.refresh()
                }
            },

            _displayTreeTables: function (headers, oInputData) {

                const depVar = 'PBR（① : Stock price standard )'
                let client = this.getView().byId('clientValueHelp').getValue().toLowerCase() // Showcase only
                let tabContainer = this.getView().byId('TabContainer')
                //Case already have table on screen
                if (tabContainer.getItems().length != 0) {
                    tabContainer.removeAllItems()
                }
                let explVar = headers[3]
                let largestNOYear = 0
                let oTreeTable = this._newTreeTable().setModel(oModel)
                let oTreeTable1 = this._newTreeTable().setModel(oModel)
                let oTreeTable2 = this._newTreeTable().setModel(oModel)
                let VerticalLayout = this.getView().byId("FinalOutputColorDefineLayout")
                //Sort input data by Explanatory variable number
                oInputData.sort((a, b) => {
                    return parseInt(a[explVar]) - parseInt(b[explVar])
                })
                console.log(oInputData)
                // oFlatTable.setVisible(false)
                /**
                 * Build JSONModel to from csv result to create Tree Table 
                 * JSON Data format should be
                 * {categories:[                        //This categories array contain large Classification array object
                 * name: LargeClassification,
                 * categories: [                        //This categories array contain MINOR Classification array object
                 * name: MinorClassification,
                 * categories: [                        //This categories array contain array object of each correlations
                 * name:ExplanatoryVariableNumber
                 * otherProperties: Properties vale
                 * ] ] ]
                 * 
                 * From this nested data structure, using TreeTable to create collapsable/expandable table by categories
                 * }
                 */
                let largeClsSet = new Set()                 //Store distinct large classification
                let oTreeTableOutput = []
                let largeClsArr = []                        //Store array of minor classificaiton object inside 1 LC
                let minorClsArr = []                        //Store array of explanatory variable inside 1 MC
                let depVarArr = []                          //Store distinct dependent variable in 1 MC (1 MC can stay in 2 LC)
                let minorInLargeSet = []                    //Store distinct MC in 1 LC (1 MC can stay in 2 LC)
                let depVarInMinorSet = []
                let depVarSet = new Set()
                for (let i = 0; i < oInputData.length; i++) {
                    let currentLine = oInputData[i]
                    let largeCls = currentLine[headers[0]]
                    let minorCls = currentLine[headers[1]]
                    let depVarName = currentLine[headers[2]]
                    let exlVarNum = currentLine[headers[3]].toString()
                    let exlVarName = currentLine[headers[4]]
                    let desiredCorr = currentLine[headers[5]]
                    let nOYear = parseInt(currentLine[headers[6]])
                    let regCorr = parseFloat(parseFloat(currentLine[headers[7]]).toFixed(5))
                    let freeAdjustCoe = parseFloat(parseFloat(currentLine[headers[8]]).toFixed(5))
                    let pValue = parseFloat(currentLine[headers[9]].toFixed(5))
                    let minorSetName = largeCls.concat('.', minorCls) //shortcut for distinct name used later
                    let depSetName = minorSetName.concat('.', depVarName)
                    //Hardcode showcase only
                    /* if (exlVarNum == '27' || exlVarName == '女性管理職比率') {
                        //thay đổi chữ số đầu của total numb
                        function changeNumb(initialNumb, replaceNumb) {
                            return parseFloat(replaceNumb.concat(initialNumb.toString().slice(1)))
                        }
                        switch (nOYear) {
                            case 0: pValue = 0.507695765
                                if (exlVarNum == '27') {
                                    regCorr = 0.57127
                                }
                                break;
                            case 1: pValue = 0.374190724
                                if (exlVarNum == '27') {
                                    regCorr = 0.86089
                                }
                                break;
                            case 2: pValue = 0.106878422
                                if (exlVarNum == '27') {
                                    regCorr = 0.96019
                                }
                                break;
                            case 3: regCorr = changeNumb(regCorr, '1')
                                if (exlVarNum != '27') {
                                    regCorr = 2.4287
                                    pValue = 0.08
                                } else {
                                    pValue = 0.013254527
                                }
                                break;
                            case 4: pValue = 0.060049413
                                if (exlVarNum != '27') {
                                    regCorr = 3.41507
                                } else {
                                    regCorr = changeNumb(regCorr, '2')
                                }

                                break;
                            case 5: pValue = 0.062750336
                                regCorr = changeNumb(regCorr, '4')
                                break;
                            case 6: pValue = 0.040626543
                                regCorr = changeNumb(regCorr, '5')
                                break;
                            case 7: pValue = 0.040584797
                                regCorr = changeNumb(regCorr, '7')
                                break;
                            case 8: pValue = 0.006769869
                                regCorr = changeNumb(regCorr, '8')
                                break;
                            case 9: pValue = 0.007110268
                                regCorr = changeNumb(regCorr, '9')
                                break;
                            case 10: pValue = 0.120791110
                                if (exlVarNum == '27') {
                                    regCorr = 9.40126
                                } else {
                                    regCorr = 9.20293
                                }
                                break;
                            case 11: pValue = 0.383930714
                                if (exlVarNum == '27') {
                                    regCorr = 9.82227
                                }
                                break;
                        }

                    } */
                    // if (!oTreeTableOutput[depVarName]) {
                    //     oTreeTableOutput[depVarName] = []
                    // }
                    //Check whether dependent variable name equal to the requirement
                    // if (depVarName == depVar) {
                    //Add 1 LC to oData 
                    if (!largeClsSet.has(largeCls)) {
                        largeClsArr[largeCls] = []
                        minorInLargeSet[largeCls] = new Set()
                        oTreeTableOutput.push({
                            name: largeCls,
                            LARGECLS: largeCls,
                            categories: largeClsArr[largeCls]
                        })
                        largeClsSet.add(largeCls)
                    }

                    //Add 1 MC object into categories of current LC
                    if (!minorInLargeSet[largeCls].has(minorCls)) {
                        minorClsArr[minorSetName] = []
                        depVarArr[depSetName] = [] // new update (remove dep var and expl num in hierachy)
                        depVarInMinorSet[minorCls] = new Set()
                        largeClsArr[largeCls].push({
                            name: minorCls,
                            MINORCLS: minorCls,
                            //Filtering
                            LARGECLS: largeCls,
                            categories: depVarArr[depSetName]
                        })
                        minorInLargeSet[largeCls].add(minorCls)
                    }

                    /**
                     * New update: no need this anymore (24/2/2023)
                     */
                    //Add 1 DVar of MC into categories of MC object
                    // if (!depVarInMinorSet[minorCls].has(depVarName)) {
                    //     // depVarArr[depSetName] = []
                    //     minorClsArr[minorSetName].push({
                    //         level: '2',
                    //         name1: depVarName,
                    //         DEPVARNAME: depVarName,
                    //         categories: depVarArr[depSetName]
                    //     })
                    //     // depVarSet.add(exlVarNum)
                    //     depVarInMinorSet[minorCls].add(depVarName)
                    // }

                    //Add 1 correlation into categories of DVar object
                    if (!depVarSet.has(exlVarNum)) {
                        depVarArr[depSetName].push({
                            //Filtering
                            MINORCLS: minorCls,
                            LARGECLS: largeCls,
                            // name1: exlVarNum,
                            EXLVARNUM: exlVarNum,
                            EXLVARNAME: exlVarName,
                            DESIREDCORR: desiredCorr,
                            FREEADJUSTCOE: freeAdjustCoe,
                            PVALUE: pValue
                        })
                        depVarSet.add(exlVarNum)
                    }

                    let lastInstance = depVarArr[depSetName][depVarArr[depSetName].length - 1]

                    if (lastInstance) {
                        //In case not all expl var name is fullfil, check whether it exists and assign value
                        if (lastInstance.EXLVARNAME == '' && exlVarName != '') {
                            lastInstance.EXLVARNAME = exlVarName
                        }
                        //subtotal the value of reg cor of an explanatory var in the same year
                        if (!lastInstance[nOYear]) {
                            lastInstance[nOYear] = regCorr
                            lastInstance[nOYear + 100] = freeAdjustCoe
                            lastInstance[nOYear + 1000] = pValue
                        } else {
                            lastInstance[nOYear] = lastInstance[nOYear] + regCorr
                            lastInstance[nOYear + 100] = lastInstance[nOYear + 100] + freeAdjustCoe
                            lastInstance[nOYear + 1000] = lastInstance[nOYear + 1000] + pValue
                        }
                        //Create new attribute to indicate what color this cell has (base on p-vale and reg cor)
                        if (lastInstance[nOYear + 100] >= 0.5) {
                            if (lastInstance[nOYear] > 0) {
                                if (lastInstance[nOYear + 1000] < 0.01) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel3'
                                } else if (lastInstance[nOYear + 1000] < 0.05) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel2'
                                } else if (lastInstance[nOYear + 1000] < 0.1) {
                                    lastInstance[nOYear + 10000] = 'pinkLevel1'
                                }
                            } else if (lastInstance[nOYear] < 0) {
                                if (lastInstance[nOYear + 1000] < 0.01) {
                                    lastInstance[nOYear + 10000] = 'blueLevel3'
                                } else if (lastInstance[nOYear + 1000] < 0.05) {
                                    lastInstance[nOYear + 10000] = 'blueLevel2'
                                } else if (lastInstance[nOYear + 1000] < 0.1) {
                                    lastInstance[nOYear + 10000] = 'blueLevel1'
                                }
                            } else {
                                lastInstance[-nOYear] = ''
                            }
                        }

                        if (nOYear > largestNOYear) {
                            largestNOYear = nOYear
                        }
                    }

                }

                //Assige oPBROutput to data consists PBR as dependent variable
                let oPBROutput = oTreeTableOutput

                //Add dynamic column base on largestNOYear
                if (oPBROutput.length != 0) {
                    for (let i = 0; i <= largestNOYear; i++) {

                        oTreeTable.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i}}`
                            })
                        }))
                        oTreeTable1.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i + 100}}`
                            })
                        }))
                        oTreeTable2.addColumn(new Column({
                            headerSpan: largestNOYear + 1,
                            minWidth: 90,
                            width: "auto",
                            multiLabels: [
                                new sap.m.Label({
                                    text: 'Number of Years',
                                    textAlign: "Left",
                                    width: "100%"
                                }),
                                new sap.m.Label({
                                    text: i
                                }),
                            ],
                            template: new sap.m.Text({
                                text: `{${i + 1000}}`
                            })
                        }))
                    }

                    //Set model
                    // oTreeTable.setVisible(true)
                    // oTreeTable1.setVisible(true)
                    // oTreeTable2.setVisible(true)
                    // oTreeTable.setModel(oModel)
                    // oTreeTable1.setModel(oModel)
                    // oTreeTable2.setModel(oModel)
                    oTreeTable.attachRowsUpdated(this.onRowsUpdated, this)
                    treeTable = oTreeTable
                    tabContainer.setVisible(true)
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'KPIxPBR Matrix',
                        content: [VerticalLayout.setVisible(true), oTreeTable]
                    }))
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'Freedom adjust coefficent',
                        content: oTreeTable1
                    }))
                    tabContainer.addItem(new sap.m.TabContainerItem({
                        name: 'P-Value',
                        content: oTreeTable2
                    }))
                    oModel.oData.treeOutput = { categories: oPBROutput }
                    oModel.refresh()
                }
            },

            onRowsUpdated: function (oEvent) {
                let oTable = oEvent.getSource()
                let rows = oEvent.getSource().getRows()
                let nORows = rows.length
                let nOCells = rows[0].getCells().length
                let oColumns = oTable.getColumns()
                let startColIndex
                // console.log(oTable)
                //Get the index of 'Desired correlation' column
                for (let i = 0; i < oColumns.length; i++) {
                    let colName = oColumns[i].getMultiLabels()[1].getText()
                    // if (colName == 'Desired correlation') {
                        if (colName == 'FLAG') { //Duyen add
                        startColIndex = i + 1
                        break
                    }
                }
                // loop over all the line records
                for (let i = 0; i < nORows; i++) {
                    let row = rows[i]
                    let rowID = row.sId
                    //format column start from 'Desired correlation' column
                    for (let j = startColIndex; j < nOCells; j++) {
                        let year = j - startColIndex - 1
                        let cell = row.getCells()[j]
                        
                        // let index_tmp = j + 1
                        // let cellContext = row.getCells()[index_tmp]
                        // let cell_tmp = row.getCells()[index_tmp]
                        let oContext = cell.mBindingInfos.text.binding.oContext
                        let cellID = rowID.concat(`-col${j}`)
                        let cellText = cell.getText()
                        if (document.getElementById(cellID)) {
                            document.getElementById(cellID).removeAttribute("style")
                        }
                        if (cellText == '+') {
                            document.getElementById(cellID).style.backgroundColor = '#ffb7c5'
                        }
                        if (cellText == '-') {
                            document.getElementById(cellID).style.backgroundColor = '#8ab9f1'
                        }
                        // cell.removeStyleClass()
                        
                            if (oContext) {
                                //Check status attribute of cell to indicate color
                                let status = oModel.getProperty(oContext.sPath)[year + 10000]
                                switch (status) {
                                    case 'pinkLevel1':
                                        document.getElementById(cellID).style.backgroundColor = '#fddde6'
                                        break
                                    case 'pinkLevel2':
                                        document.getElementById(cellID).style.backgroundColor = '#ffb7c5'
                                        break
                                    case 'pinkLevel3':
                                        document.getElementById(cellID).style.backgroundColor = '#f99494'
                                        break
                                    case 'blueLevel1':
                                        document.getElementById(cellID).style.backgroundColor = '#add8e6'
                                        break
                                    case 'blueLevel2':
                                        document.getElementById(cellID).style.backgroundColor = '#8ab9f1' 
                                        break
                                    case 'blueLevel3':
                                        document.getElementById(cellID).style.backgroundColor = '#4166f5'
                                        break
                                }
    
                            
                        } 
                    }
                }
            },
            exportExcel: function (oEvent) {
                //get tree table to get current filters
                let oTable = oEvent.getSource().getParent().getParent()
                let fileName = ""
                let currentTabStrip = oTable.getParent().getName()
                let oListBinding = oModel.bindList("/output")
                let noDynamicCol = oDynamicColNum
                let controlFilters = new Filter(oTable.getBinding().aFilters, true)
                let appFilters = oTable.getBinding().aApplicationFilters
                if (controlFilters != [] && appFilters != []) {
                    oListBinding.filter(controlFilters, "Control")
                    oListBinding.filter(appFilters, "Application")
                } else if (controlFilters != []) {
                    oListBinding.filter(controlFilters, "Control")
                } else {
                    oListBinding.filter(appFilters, "Application")
                }

                // Config columns of output excel file
                let aCols = []
                // this.xlsxExport()
                aCols.push({
                    label: "Large classification",
                    property: "LARGECLS",
                    width: "5"
                })
                aCols.push({
                    label: "Minor classification",
                    property: "MINORCLS",
                    width: "30"
                })
                aCols.push({
                    label: "Name of dependent variable",
                    property: "DEPVARNAME",
                    width: "25"
                })
                aCols.push({
                    label: "Explanatory variable number",
                    property: "EXLVARNUM",
                    width: "15"
                })
                aCols.push({
                    label: "Explanatory variable name",
                    property: "EXLVARNAME",
                    width: "30"
                })
                //Duyen add
                aCols.push({
                    label: "Flag",
                    property: "FLAG",
                    width: "30"
                })

                aCols.push({
                    label: "Desired correlation",
                    property: "DESIREDCORR",
                    width: "30"
                })

                
                switch (currentTabStrip) {
                    case "KPIxPBR Matrix":
                        for (let i = 0; i <= noDynamicCol; i++) {
                            aCols.push({
                                label: i.toString(),
                                property: i.toString(),
                                type: sap.ui.export.EdmType.Number,
                                scale: 9,
                                width: 12
                            })
                        }
                        fileName = "KPI-PBRMatrix.xlsx"
                        break;
                    case "Freedom adjust coefficent":
                        for (let i = 0; i <= noDynamicCol; i++) {
                            aCols.push({
                                label: i.toString(),
                                property: (i + 100).toString(),
                                type: sap.ui.export.EdmType.Number,
                                scale: 9,
                                width: 12
                            })
                        }
                        fileName = "KPI-PBRMatrix-Freedom Adjust Coefficent.xlsx"
                        break;
                    case "P-Value":
                        for (let i = 0; i <= noDynamicCol; i++) {
                            aCols.push({
                                label: i.toString(),
                                property: (i + 1000).toString(),
                                type: sap.ui.export.EdmType.Number,
                                scale: 9,
                                width: 12
                            })
                        }
                        fileName = "KPI-PBRMatrix - P-value.xlsx"
                        break;
                }
                let oSettings = {
                    workbook: {
                        columns: aCols
                    },
                    dataSource: oListBinding,
                    fileName: fileName
                }

                let oSheet = new Spreadsheet(oSettings)
                oSheet.build()
                    .then(function () {
                        MessageToast.show('Spreadsheet export has finished');
                    }).finally(function () {
                        oSheet.destroy();
                    });
            },
            /**
             * XLSXExport function (developing)
             * @param {*} oJsonData 
             */
            xlsxExport: function (oJsonData) {
                // let table = this.getView().byId('treeTable')
                let treeOData = this.getView().getModel().oData.treeOutput
                let flatOData = this.getView().getModel().oData.output
                let headers = Object.keys(flatOData)
                // console.log(headers)

                // var wstb = XLSX.utils.table_to_sheet(table)
                var ws = XLSX.utils.json_to_sheet(flatOData);
                const LightBlue = {
                    bgColor: { rgb: "3832DC" }
                };
                for (let i in ws) {
                    // console.log(i)
                    if (typeof ws[i] == "object") {
                        // let cell = XLSX.utils.decode_cell(i);
                        if (ws[i].t == 'n') {
                            if (ws[i].v < 0) {
                                ws[i].s = { // styling for all cells
                                    fill: { // background color
                                        patternType: "solid",
                                        fgColor: { rgb: "b2b2b2" },
                                        bgColor: { rgb: "b2b2b2" }
                                    },
                                    font: {
                                        name: '宋体',
                                        sz: 24,
                                        bold: true,
                                        color: { rgb: "FFAA00" }
                                    }
                                }
                            }
                        }
                    }
                }
                console.log(ws)
                /* add to workbook */
                var wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "People");
                console.log(wb)

                XLSX.writeFile(wb, "sheetjs.xlsx", { cellStyles: "true" });
            },
            _newTreeTable: function (ID) {
                let that = this

                // clear filter button
                let clearFilterBtn = new Button({
                    icon: "sap-icon://decline",
                    tooltip: "Clear all filters"
                }).attachPress(that._clearAllFilter, that)

                // search field
                let searchField = new sap.m.SearchField({
                    placeholder: "Filter",
                    value: "{searchField>/globalFilter}",
                    width: "15rem"
                }).attachSearch(that.searchGlobally, that)

                //export excel button
                let exportExcelButton = new Button({
                    icon: "sap-icon://excel-attachment",
                    tooltip: "Export Excel File"
                }).attachPress(that.exportExcel, that)

                //Table Toolbar
                let oToolbar = new sap.m.Toolbar({
                    content: [
                        new sap.m.ToolbarSpacer({}),
                        clearFilterBtn,
                        searchField,
                        exportExcelButton
                    ]
                })

                let oColumns = this._newFixedColumns()
                //Tree table object
                let treeTable = new TreeTable(ID, {
                    selectionMode: 'None',
                    // rowsUpdated: that.onRowsUpdated(this),
                    rows: "{path:'/treeOutput', parameters: {arrayNames:['categories']}}",
                    extension: oToolbar,
                    columns: oColumns,
                    visibleRowCountMode: sap.ui.table.VisibleRowCountMode.Auto
                })
                return treeTable
            },

            /**
             * handler for search event of table searchField
             */
            searchGlobally: function (oEvent) {
                let sQuery = oEvent.getParameters("query").query
                let oTable = oEvent.getSource().getParent().getParent()
                console.log(oTable.getBinding())
                let oFilters = null
                if (sQuery) {
                    oFilters = new Filter([
                        new Filter("LARGECLS", FilterOperator.Contains, sQuery),
                        new Filter("MINORCLS", FilterOperator.Contains, sQuery),
                        new Filter("EXLVARNAME", FilterOperator.Contains, sQuery),
                        new Filter("DESIREDCORR", FilterOperator.Contains, sQuery),
                        new Filter("FLAG", FilterOperator.Contains, sQuery) //Duyen add
                    ], false)
                }
                oTable.getBinding().filter(oFilters, "Application")
                // oTable.getBinding().aFilters.push(oFilters)
            },

            /**
             * Create grid table object
             * @param {*} ID 
             * @returns 
             */
            // _newFlatTable: function (ID) {
            //     let that = this
            //     //Table toolbar -->download button
            //     let oToolbar = new sap.m.Toolbar({
            //         content: [
            //             new sap.m.ToolbarSpacer({}),
            //             new Button({
            //                 icon: "sap-icon://excel-attachment",
            //                 tooltip: "Export Excel File"
            //             }).attachPress(that.exportExcel, that)]

            //     })

            //     let oColumns = this._newFixedColumns()

            //     let flatTable = new Table(ID, {
            //         selectionMode: "None",
            //         rows: "{/output}",
            //         width: "100%",
            //         extension: oToolbar,
            //         visibleRowCountMode: 'Interactive',
            //         columns: oColumns
            //     })

            //     return flatTable
            // },

            _clearAllFilter: function (oEvent) {
                let oTable = oEvent.getSource().getParent().getParent()
                let searchModel = this.getView().getModel('searchField')
                // Remove the value of searchField
                searchModel.setProperty("/globalFilter", "");
                // set filter of table to null
                oTable.getBinding().filter(null, "Application")
                oTable.getBinding().filter(null, "Control")
                var aColumns = oTable.getColumns();
                for (var i = 0; i < aColumns.length; i++) {
                    oTable.filter(aColumns[i], null);
                }
            },
            /**
             * Create new fixed columns aggregation object 
             */
            _newFixedColumns: function () {
                let oColumns = [
                    new sap.ui.table.Column({
                        width: "12rem",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Hierarchy"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{name}',
                            tooltip: '{name}'
                        })
                    }),
                    new sap.ui.table.Column({
                        width: "4rem",
                        filterProperty: "LARGECLS",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Large classification"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{LARGECLS}',
                            tooltip: '{LARGECLS}',
                            maxLines: 2
                        })
                    }),
                    new sap.ui.table.Column({
                        width: "11rem",
                        filterProperty: "MINORCLS",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Minor classification"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{MINORCLS}',
                            tooltip: '{MINORCLS}',
                            maxLines: 2
                        })
                    }),
                    new sap.ui.table.Column({
                        width: "5rem",
                        filterProperty: "EXLVARNUM",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Explanatory variable number"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{EXLVARNUM}',
                            // tooltip: '{EXLVARNUM}',
                            maxLines: 2
                        })
                    }),
                    new sap.ui.table.Column({
                        width: "11rem",
                        filterProperty: "EXLVARNAME",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Explanatory variable name"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{EXLVARNAME}',
                            tooltip: '{EXLVARNAME}',
                            maxLines: 2
                        })
                    }),
                    
                    //Add Duyen
                    new sap.ui.table.Column({
                        width: "3rem",
                        filterProperty: "FLAG",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "FLAG"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{FLAG}',
                            tooltip: '{FLAG}'
                        })
                    }),

                    new sap.ui.table.Column({
                        width: "3rem",
                        filterProperty: "DESIREDCORR",
                        multiLabels: [
                            new sap.m.Label({
                                visible: false
                            }),
                            new sap.m.Label({
                                text: "Desired correlation"
                            })
                        ],
                        template: new sap.m.Text({
                            text: '{DESIREDCORR}',
                            tooltip: '{DESIREDCORR}'
                        })
                    }),
                ]
                return oColumns
            },
            /**
             * Rename the key of json data get from excel file to fit with database table
             * @param {*} oInputData 
             * @param {*} headers 
             * @returns 
             */
            _renameKey: function (oInputData, headers) {
                let inputModel = []
                for (let i = 0; i < oInputData.length; i++) {
                    let currentLine = oInputData[i]
                    let largeCls = currentLine[headers[0]]
                    let minorCls = currentLine[headers[1]]
                    let depVarName = currentLine[headers[2]]
                    let exlVarNum = currentLine[headers[3]].toString()
                    let exlVarName = currentLine[headers[4]]
                    let desiredCorr = currentLine[headers[5]]
                    let nOYear = currentLine[headers[6]].toString()
                    let regCorr = parseFloat(currentLine[headers[7]]).toString()
                    let freeadjustcoe = parseFloat(currentLine[headers[8]]).toString()
                    let pValue = parseFloat(currentLine[headers[9]])
                    inputModel.push({
                        MAJ_CLASS: largeCls,
                        MIN_CLASS: minorCls,
                        DEP_NAME: depVarName,
                        EXPL_VAR: exlVarNum,
                        EXPL_VAR_NAME_2: exlVarName,
                        DESIRED_CORR: desiredCorr,
                        SHIFT_YEAR: nOYear,
                        RE_COEFFICIENT_2: regCorr,
                        DE_COEFFICIENT_AFT: freeadjustcoe,
                        P_VAL_2: pValue
                    })
                }
                return inputModel

            },
            getInput: function (client) {
                let oView = this.getView()
                let url = `/graph/getInputWithClient(client='${client}')`
                let oHeaders, oInputData
                let that = this
                let oModel = oView.getModel()
                oView.setBusy(true)
                $.ajax({
                    type: "GET",
                    url: url,
                    cache: false,
                    success: function (data) {
                        oView.setBusy(false)
                        oInputData = data.value
                        if (oInputData.length > 0) {
                            oModel.setProperty('/input', oInputData)
                            console.log(oInputData)
                            oHeaders = Object.keys(oInputData[0])
                            that._displayTreeTables(oHeaders, oInputData)
                            that._prepareFlatData(oHeaders, oInputData)
                        } else {
                            MessageBox.show('Client has no data')
                        }

                    }, //succes
                    error: function (data) {
                        oView.setBusy(false)
                        console.log(data);
                        MessageToast.show('Request fails')
                    }//error
                })
            },

            //Get input from R-Program - Duyen
            getInput_R: function () {
                let oView = this.getView()
                let oModel = oView.getModel()
                let validCode = this._inputFieldsValidCode()
                console.log('valid code', validCode)
                if (validCode == '0') {
                    this.displayWarningDialog('Warning', 'Please choose a client')
                    return
                }
                if (validCode == '10' || validCode == '11') {
                    this.displayWarningDialog('Warning', 'Please choose an existed client')
                    return
                }
                if (validCode == '20' || validCode == '21') {
                    this.displayWarningDialog('Warning', 'Please choose an existed item')
                    return
                }
                let client = oModel.getProperty('/SelectedClient')
                let client_item = oModel.getProperty('/SelectedClientItem')
                let url = `/graph/getOverlookingAnalysis(client='${client}',client_item='${client_item}')`
                let oHeaders_R, oInputData_R
                let that = this
                oView.setBusy(true)
                $.ajax({
                    type: "GET",
                    url: url,
                    cache: false,
                    success: function (data) {
                        oView.setBusy(false)
                        oInputData_R = data.value
                        console.log(oInputData_R)
                        if (oInputData_R.length > 0) {
                            oModel.setProperty('/input', oInputData_R)
                            console.log(oInputData_R)
                            oHeaders_R = Object.keys(oInputData_R[0])
                            that._displayTreeTables_R(oHeaders_R, oInputData_R)
                            that._prepareFlatData_R(oHeaders_R, oInputData_R)
                        } else {
                            MessageBox.show('Client has no data')
                        }

                    }, //succes
                    error: function (data) {
                        oView.setBusy(false)
                        console.log(data);
                        MessageToast.show('Request fails')
                    }//error
                })
            },

            /**
             * Create suggestion when user type on Client Input Field
             * @param {*} oEvent 
             */
            onSuggest: function (oEvent) {
                // console.log(oEvent.getSource())
                var sValue = oEvent.getParameter("suggestValue"),
                    aFilters = [];
                if (sValue) {
                    aFilters.push(new Filter("CLIENT", FilterOperator.Contains, sValue));
                }
                console.log(oEvent.getSource().getBinding("suggestionItems"))
                oEvent.getSource().getBinding("suggestionItems").filter(aFilters);
                // this.oSF.getBinding("suggestionItems").filter(aFilters);
                // this.oSF.suggest();
            },

            /**
             * Handle event press when user click on ValueHelp button in Input Field
             * @param {*} oEvent 
             */
            handleValueHelp: function (oEvent) {
                var oView = this.getView();
                let dialogPath = 'catalog.view.ValueHelpDialog'
                this._sInputId = oEvent.getSource().getId();
                this._sDialogName = oEvent.getSource().getPlaceholder()
                if (oEvent.getSource().getPlaceholder() == 'Client Item') dialogPath = 'catalog.view.ClientItemDialog'

                // create value help dialog
                // if (!this._pValueHelpDialog) {
                this._pValueHelpDialog = Fragment.load({
                    id: oView.getId(),
                    name: dialogPath,
                    controller: this
                }).then(function (oValueHelpDialog) {
                    oView.addDependent(oValueHelpDialog);
                    return oValueHelpDialog;
                });
                // }

                // open value help dialog
                this._pValueHelpDialog.then(function (oValueHelpDialog) {
                    oValueHelpDialog.open();
                });
            },

            /**
             * Whenver user type on value help dialog search field
             * @param {*} oEvent 
             */
            _handleValueHelpSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                let filterCategory = (this._sDialogName == 'Client') ? 'CLIENT' : 'CLIENT_ITEM'
                var oFilter = new Filter(
                    filterCategory,
                    FilterOperator.Contains, sValue
                );
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },


            _handleValueHelpClose: function (oEvent) {
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([]);
                var aContexts = oEvent.getParameter("selectedContexts");
                if (aContexts && aContexts.length) {
                    var clientInput = this.byId(this._sInputId);
                    if (this._sDialogName == 'Client') {
                        clientInput.setValue(aContexts[0].getObject().CLIENT);
                        this._setClientItemModel()
                    } else {
                        clientInput.setValue(aContexts[0].getObject().CLIENT_ITEM);
                        this.getInput_R(aContexts[0].getObject().CLIENT, aContexts[0].getObject().CLIENT_ITEM); //Duyen
                    }


                    //this.getInput(aContexts[0].getObject().CLIENT)
                }
                // oModel.refresh()
                // console.log(aContexts[0].getObject().CLIENT)
                // console.log(oEvent.getSource())
                // var oSelectedItem = oEvent.getParameter("selectedItem");
                // if (oSelectedItem) {
                //     var productInput = this.byId(this._sInputId);
                //     productInput.setValue(oSelectedItem.getTitle());
                // }
                // oEvent.getSource().getBinding("items").filter([]);
            },

            fetchClients: function () {
                let oModel = this.getView().getModel()
                let that = this
                $.ajax({
                    type: "GET",
                    url: '/graph/fetchClients()',
                    cache: false,
                    success: function (data) {
                        let result = data.value
                        let groupedClient = {}
                        let clients = []
                        result.forEach(element => {
                            if (!groupedClient[element.CLIENT]) {
                                groupedClient[element.CLIENT] = [element]
                                clients.push({ CLIENT: element.CLIENT })
                            }
                            else groupedClient[element.CLIENT].push(element)
                        });
                        console.log(groupedClient)
                        oModel.setProperty("/groupedClients", groupedClient)
                        oModel.setProperty("/Clients", clients)
                        that._setClientItemModel()
                        // console.log(oModel)
                    }, //succes
                    error: function (data) {
                        console.log(data)
                    }//error
                })
                oModel.refresh()
            },

            /**
             * Check client and client item input field
             * Return code:
             * 0: client empty
             * 10: client not existed, clientItem empty
             * 11: client not existed, clientItem not existed
             * 20: client existed, clientItem empty
             * 21: client existed, clientItem not existed
             * 22: client existed, clientItem existed
             * @returns 
             */
            
            _inputFieldsValidCode: function () {
                let oModel = this.getView().getModel()
                let selectedClient = oModel.getProperty('/SelectedClient').trim()
                let selectedClientItem = oModel.getProperty('/SelectedClientItem').trim()
                let client = oModel.getProperty('/Clients')
                let clientItem = oModel.getProperty('/ClientItem')
                console.log(client)
                if (selectedClient == undefined || selectedClient.trim() == '') return '0' // Client empty

                let isClientExisted = client.find(element =>
                    element.CLIENT == selectedClient
                )
                console.log(isClientExisted)
                //Client existed
                if (isClientExisted) {
                    if (selectedClientItem == undefined || selectedClientItem.trim() == '') return '20' //  clientItem empty
                    let isClientItemExisted = clientItem.find(element =>
                        element.CLIENT_ITEM == selectedClientItem
                    )
                    if (isClientItemExisted) return '22' // clientItem existed
                    return '21' // clientItem not existed
                } else { //Client not existed
                    if (selectedClientItem == undefined || selectedClientItem.trim() == '') return '10' //
                    else return '11'
                }
                //client not existed
                // console.log(inputField)
                // console.log(oClient)
                // if (inputField == '') {
                //     MessageBox.alert('Please choose a Client')
                //     return false
                // } else {
                //     for (let i = 0; i < oClient.length; i++) {
                //         if (oClient[i].CLIENT === inputField) {
                //             return { isExist: true, clientKey: oClient[i].CLIENT, clientName: oClient[i].CLIENT }
                //         }
                //     }
                //     // MessageBox.alert("Client doesn't exist") 
                //     return { isExist: false, clientKey: inputField }
                // }

            },

            /**
             * Delete Client in HANA DATABASE by ClientName
             * @param {*} oEvent 
             */
            _deleteClient: function (oEvent) {
                let oView = this.getView()
                let that = this
                let sClient, sClientItem
                let confirmText
                console.log(oEvent.getSource().getParent())
                let selectedClient = oEvent.getSource().getParent().getCells()[0].getTitle()
                if (this._sDialogName == 'Client') {
                    sClient = selectedClient
                    sClientItem = undefined
                    confirmText = new sap.m.Text({ text: `All Client items belong to Client ${sClient} will be deleted. Do you want to delete the Client ${sClient}?` })
                } else {
                    let oClientItemModel = oView.getModel().getProperty('/ClientItem')
                    let oClientPair = oClientItemModel.find(element => element.CLIENT_ITEM == selectedClient)
                    sClient = oClientPair.CLIENT
                    sClientItem = oClientPair.CLIENT_ITEM
                    confirmText = new sap.m.Text({ text: `Do you want to delete Client ${sClient} Client item ${sClientItem}` })
                }

                // if (!this.oApproveDialog) {
                this.oApproveDialog = new Dialog({
                    type: DialogType.Message,
                    title: "Confirm",
                    content: confirmText,
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "Yes",
                        press: function () {
                            oView.setBusy(true)
                            $.ajax({
                                type: "GET",
                                url: `/graph/deleteInputofClient(client='${sClient}',client_item='${sClientItem}')`,
                                cache: false,
                                success: function (data) {
                                    that.getView().getModel().setProperty('/treeOutput', [])
                                    that.getView().getModel().setProperty('/output', [])
                                    MessageToast.show(`Client ${sClient}${(sClientItem) ? '(' + sClientItem + ')' : ''} has been removed`)
                                    let inputID = that._sInputId
                                    that.byId(inputID).setValue()
                                    that.fetchClients()
                                    oView.setBusy(false)
                                }, //succes
                                error: function (data) {
                                    oView.setBusy(false)
                                    // MessageBox.show('Server is busy now, please try later')
                                }//error
                            })
                            this.oApproveDialog.close();
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            this.oApproveDialog.close();
                        }.bind(this)
                    })
                });
                // }
                this.oApproveDialog.open();
            },

            upload: function () {
                let validCode = this._inputFieldsValidCode()
                let oModel = this.getView().getModel()
                let oConfirmText
                let sClient = oModel.getProperty('/SelectedClient').trim()
                let sClientItem = oModel.getProperty('/SelectedClientItem').trim()
                let that = this
                let oInput = oModel.getProperty('/input')
                if (validCode == '0') {
                    this.displayWarningDialog('Warning', 'Please choose a client')
                    return
                }
                if (validCode == '10' || validCode == '20') {
                    this.displayWarningDialog('Warning', 'Please choose a client item')
                    return
                }
                if(validCode == '22'){
                    oConfirmText = new sap.m.Text({ text: `Upload data will be overrided to Client ${sClient} - ${sClientItem}. Do you want to save to database ?` })
                } else{
                    oConfirmText = new sap.m.Text({ text: `Do you want to save to database ?` })
                }
                // let uploadBtn = this.getView().byId('UploadBtn')
                // if (clientCheck) {
                
                
                // if (clientCheck.isExist) {
                // if (!this.oUploadDialog) {
                this.oUploadDialog = new Dialog({
                    type: DialogType.Message,
                    title: "Confirm",
                    content: oConfirmText,
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "Yes",
                        press: function () {
                            this._uploadDB(sClient, sClientItem, oInput)
                            this.oUploadDialog.close()
                        }.bind(this)
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            this.oUploadDialog.close();
                        }.bind(this)
                    })
                });
                // }
                this.oUploadDialog.open();
                // } else {
                // if (!this.oUploadDialog) {
                // this.oUploadDialog = new Dialog({
                //     type: DialogType.Message,
                //     title: "Confirm",
                //     content: new sap.m.Text({
                //         text: `Client ${clientKey} does not exist.
                //         Do you want to create it?` }),
                //     beginButton: new Button({
                //         type: ButtonType.Emphasized,
                //         text: "Yes",
                //         press: function () {
                //             let oEntry = {}
                //             oEntry.CLIENT = clientKey
                //             oEntry.CLIENT = clientKey

                //             $.ajax({
                //                 url: '/graph/CLIENTS',
                //                 type: "GET",
                //                 beforeSend: function (xhr) {
                //                     xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                //                     xhr.setRequestHeader("Content-Type", "application/atom+xml");
                //                     xhr.setRequestHeader("DataServiceVersion", "2.0");
                //                     xhr.setRequestHeader("X-CSRF-Token", "Fetch");
                //                 },

                //                 success: function (oData, oStatus, XMLHttpRequest) {
                //                     var header_token = XMLHttpRequest.getResponseHeader('X-CSRF-Token');
                //                     console.log(header_token)
                //                     let headers
                //                     if (header_token != null || header_token != undefined) {
                //                         headers = {
                //                             "X-CSRF-Token": header_token,
                //                             "Content-Type": 'application/json'// File type
                //                         }
                //                     } else {
                //                         headers = {
                //                             "Content-Type": 'application/json'// File type}
                //                         }
                //                     }
                //                     $.ajax({
                //                         url: '/graph/CLIENTS',
                //                         type: "POST",
                //                         data: JSON.stringify(oEntry), //user input file

                //                         // beforeSend: function(xhr) { 
                //                         // 	xhr.setRequestHeader("X-CSRF-Token", header_token); 
                //                         // 	xhr.setRequestHeader("Content-Type", "application/json"); 
                //                         // },
                //                         headers: headers,
                //                         success: async function (oData, oStatus, XMLHttpRequest) {
                //                             await that.fetchClients()
                //                             await that._uploadDB(clientKey, oInput)
                //                             console.log('success')
                //                         }.bind(this),

                //                         error: function (oError) {
                //                             console.log('request fail')

                //                         }.bind(this),
                //                     });

                //                 }.bind(this),

                //                 error: function (oError) {
                //                     // if (++requestDone === numberofRequests) {
                //                     //     // MessageBox.success("Successfully saved to database");
                //                     //     oView.setBusy(false)
                //                     // }
                //                     console.log(oError)

                //                     // errMes = 1

                //                 }.bind(this),

                //             });

                //             this.oUploadDialog.close();
                //         }.bind(this)
                //     }),
                //     endButton: new Button({
                //         text: "Cancel",
                //         press: function () {
                //             this.oUploadDialog.close();
                //         }.bind(this)
                //     })
                // });
                // // }
                // this.oUploadDialog.open();
                // }

                // }
            },

            _uploadDB: async function (sClient, sClientItem, input) {
                let oInput = Object.assign([], input)
                let oView = this.getView()
                oView.setBusy(true)
                let that = this
                // let numberofRequests = oInput.length
                // let requestDone = 0
                // let requestSucceed = 0
                // if (numberofRequests > 0) {
                //     oView.setBusy(true)
                // }
                
                //Delete client Data
                // await $.ajax({
                //     type: "GET",
                //     url: `/graph/deleteInputofClient(client='${sClient}',client_item='${sClientItem}')`,
                //     cache: false,
                //     success: function (data) {
                //         console.log('success delete client data')
                //     }, //succes
                //     error: function (data) {
                //         // oView.setBusy(false)
                //         // MessageBox.show('Server is busy now, please try later')
                //     }//error
                // })

                await $.ajax({
                    url: `/graph/deleteInputofClient(client='${sClient}',client_item='${sClientItem}')`,
                    type: "GET",
                    beforeSend: function (xhr) {
                        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                        xhr.setRequestHeader("Content-Type", "application/atom+xml");
                        xhr.setRequestHeader("DataServiceVersion", "2.0");
                        xhr.setRequestHeader("X-CSRF-Token", "Fetch");
                    },

                    success: function (oData, oStatus, XMLHttpRequest) {
                        var header_token = XMLHttpRequest.getResponseHeader('X-CSRF-Token');
                        console.log(header_token)
                        let headers
                        if (header_token != null || header_token != undefined) {
                            headers = {
                                "X-CSRF-Token": header_token,
                                "Content-Type": 'application/json'// File type
                            }
                        } else {
                            headers = {
                                "Content-Type": 'application/json'// File type}
                            }
                        }


                        //*** TEST action --> TEST successful
                        for(let i = 0; i<oInput.length; i++){
                            oInput[i].CLIENT = sClient
                            oInput[i].CLIENT_ITEM = sClientItem
                            oInput[i].SEQUENCE_NO = i.toString()
                        }
                        
                        $.ajax({
                            type: "POST",
                            url: '/graph/upload',
                            data: JSON.stringify({ uploadData: oInput }),
                            headers: headers,
                            cache: false,
                            success: function (data) {
                                console.log('success', data)
                                oView.setBusy(false)
                                MessageBox.show('Success', { title: 'Upload Completed' })
                                that.fetchClients()
                            }, //succes
                            error: function (data) {
                                console.log('error', data)
                                oView.setBusy(false)
                                MessageBox.show('Server is busy now, please try again', { title: 'Upload Failed' })
                            }//error
                        })

                        //*** TEST action

                        /**
                         * Resend failure request after an interval (1000ms) - No missed request
                         */
                        // let intervalID = setInterval(() => {
                        //     for (let i = 0; i < oInput.length; i++) {
                        //         if (!oInput[i].STATUS) {
                        //             oInput[i].STATUS = 'OPEN'
                        //         }
                        //         if (oInput[i].STATUS === 'OPEN' || oInput[i].STATUS === 'ERROR') {
                        //             oInput[i].STATUS = 'PENDING'
                        //             let oEntry = JSON.parse(JSON.stringify(oInput[i]))
                        //             oEntry.CLIENT = client
                        //             delete oEntry.STATUS
                        //             $.ajax({
                        //                 type: "POST",
                        //                 url: '/catalog/INPUT_SAMPLE_MATRIX',
                        //                 data: JSON.stringify(oEntry),
                        //                 headers: headers,
                        //                 cache: false,
                        //                 success: function (data) {
                        //                     oInput[i].STATUS = 'SUCCEED'
                        //                     requestDone++
                        //                     if (++requestSucceed === numberofRequests) {
                        //                         oView.setBusy(false)
                        //                         // requestTimeOut = true
                        //                         MessageBox.show('Success', { title: 'Upload Completed' })
                        //                         clearInterval(intervalID)
                        //                     }
                        //                 }, //succes
                        //                 error: function (data) {
                        //                     oInput[i].STATUS = 'ERROR'
                        //                     requestDone++
                        //                     if (requestDone > 4 * numberofRequests) {
                        //                         oView.setBusy(false)
                        //                         clearInterval(intervalID)
                        //                     }
                        //                 }//error
                        //             })
                        //         }
                        //     }
                        // }, 1000);

                    }.bind(this),

                    error: function (oError) {

                        MessageBox.alert("Serve is busy now, please try again");
                        oView.setBusy(false)

                        console.log(oError)

                        // errMes = 1

                    }.bind(this)
                })
                // let oInput = this.getView().getModel().getProperty('/input')

            },

            /**
             * Shortcut for display Warning Dialog with dynamic message
             * @param {*} title 
             * @param {*} message 
             */
            displayWarningDialog: function (title, message) {
                let oWarningMessageDialog = new Dialog({
                    type: DialogType.Message,
                    title: title,
                    state: ValueState.Warning,
                    content: new sap.m.Text({ text: message }),
                    beginButton: new Button({
                        type: ButtonType.Emphasized,
                        text: "OK",
                        press: function () {
                            oWarningMessageDialog.close();
                        }.bind(this)
                    })
                });
                oWarningMessageDialog.open();
            },

            /**
             * Set Client Item Model after user choose Client
             */
            _setClientItemModel: function () {
                let oModel = this.getView().getModel()
                let client = oModel.getProperty('/SelectedClient')
                if (client != undefined && client.trim() != '') {
                    let groupedClients = oModel.getProperty('/groupedClients')
                    oModel.setProperty('/ClientItem', groupedClients[client])
                } else{
                    oModel.setProperty('/ClientItem',[])
                }

            }
        });

    });
