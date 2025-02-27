var apexMonacoEditor = function (apex) {
    "use strict";
    var util = {
        "featureDetails": {
            name: "APEX-VS-Monaco-Editor",
            scriptVersion: "1.0.2.2",
            utilVersion: "1.6",
            url: "https://github.com/RonnyWeiss",
            url2: "https://linktr.ee/ronny.weiss",
            license: "MIT-License"
        },
        isDefinedAndNotNull: function (pInput) {
            if (typeof pInput !== "undefined" && pInput !== null && pInput != "") {
                return true;
            } else {
                return false;
            }
        },
        loader: {
            start: function (id, setMinHeight) {
                if (setMinHeight) {
                    $(id).css("min-height", "100px");
                }
                apex.util.showSpinner($(id));
            },
            stop: function (id, removeMinHeight) {
                if (removeMinHeight) {
                    $(id).css("min-height", "");
                }
                $(id + " > .u-Processing").remove();
                $(id + " > .ct-loader").remove();
            }
        },
        splitString2Array: function (pString) {
            if (typeof pString !== "undefined" && pString !== null && pString != "" && pString.length > 0) {
                if (apex && apex.server && apex.server.chunk) {
                    return apex.server.chunk(pString);
                } else {
                    /* apex.server.chunk only avail on APEX 18.2+ */
                    var splitSize = 8000;
                    var tmpSplit;
                    var retArr = [];
                    if (pString.length > splitSize) {
                        for (retArr = [], tmpSplit = 0; tmpSplit < pString.length;) retArr.push(pString.substr(tmpSplit, splitSize)), tmpSplit += splitSize;
                        return retArr
                    }
                    retArr.push(pString);
                    return retArr;
                }
            } else {
                return [];
            }
        }
    };
    var editor;
    var gRegionID;
    /***********************************************************************
     **
     ** Used to upload clob
     **
     ***********************************************************************/
    function uploadFiles(pConfig, pStr) {
        var items2Submit = pConfig.items2Submit;

        util.loader.start(pConfig.regionSel);

        var strArr = util.splitString2Array(pStr);

        apex.debug.info({
            "fct": util.featureDetails.name + " - " + "uploadFiles",
            "msg": "Upload started!",
            "strArr": strArr,
            "featureDetails": util.featureDetails
        });

        apex.server.plugin(pConfig.ajaxID, {
            x01: "POST",
            f01: strArr,
            pageItems: items2Submit
        }, {
            success: function (pData) {
                $(pConfig.regionIDRefreshSel).trigger("upload-finished");
                apex.message.showPageSuccess("File saved!");
                apex.debug.info({
                    "fct": util.featureDetails.name + " - " + "uploadFiles",
                    "msg": "Upload finished!",
                    "pData": pData,
                    "featureDetails": util.featureDetails
                });
                util.loader.stop(pConfig.regionSel);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $(pConfig.regionIDRefreshSel).trigger("upload-error");
                apex.debug.error({
                    "fct": util.featureDetails.name + " - " + "uploadFiles",
                    "msg": "Upload error!",
                    "jqXHR": jqXHR,
                    "textStatus": textStatus,
                    "errorThrown": errorThrown,
                    "featureDetails": util.featureDetails
                });

                util.loader.stop(pConfig.regionSel);
                apex.event.trigger(pOpts.affElementID, 'imageuploaderror');
            }
        });
    }

    /***********************************************************************
     **
     ** Used to init an editor
     **
     ***********************************************************************/
    function initEditor(pConfig, pOrgStr, pIsDiffEditor, pDiffStr) {
        var el = document.getElementById(pConfig.regionID);
        if (pIsDiffEditor) {
            var originalModel = monaco.editor.createModel(pOrgStr, pConfig.language);
            var modifiedModel = monaco.editor.createModel(pDiffStr, pConfig.language);
            var renderSideBySide = pOrgStr !== pDiffStr;//to render side by side

            editor = monaco.editor.createDiffEditor(el, {
                originalEditable: !pConfig.readOnly,
                readOnly: true,
                language: pConfig.language,
                theme: pConfig.theme,
                automaticLayout: true,
                renderSideBySide: renderSideBySide
            });
            document.getElementById(gRegionID).editor = editor;
            document.getElementById(gRegionID).originalModel = originalModel;
            document.getElementById(gRegionID).modifiedModel = modifiedModel;

            editor.setModel({
                original: originalModel,
                modified: modifiedModel
            });
        } else {
            editor = monaco.editor.create(el, {
                value: pOrgStr,
                language: pConfig.language,
                theme: pConfig.theme,
                automaticLayout: true,
                readOnly: pConfig.readOnly
                // readOnly:true
            });
            document.getElementById(gRegionID).editor = editor;
        }
    }

    /***********************************************************************
     **
     ** Used to create a button
     **
     ***********************************************************************/
    function createButton(pIcon) {
        var iconContainer = $("<div></div>");
        iconContainer.addClass("apex-vs-monaco-editor-toolbar-container-btn");
        iconContainer.addClass("a-Button");

        var icon = $("<span></span>")
        icon.addClass("fas fa-md");
        icon.addClass(pIcon);
        icon.addClass("apex-vs-monaco-editor-toolbar-container-btn-icon");

        iconContainer.append(icon);
        return iconContainer;
    }

    function createPreviewButton(pIcon, pID) {
        var iconContainer = $("<div></div>");
        iconContainer.addClass("apex-vs-monaco-editor-toolbar-container-btn");
        iconContainer.addClass("a-Button");

        var icon = $("<span></span>")
         icon.attr("id", pID); 
        icon.addClass("fas fa-md");
        icon.addClass(pIcon);
        icon.addClass("apex-vs-monaco-editor-toolbar-container-btn-icon");

        iconContainer.append(icon);
        return iconContainer;
    }

    /***********************************************************************
     **
     ** Used to render Toolbar
     **
     ***********************************************************************/
    function addToolbar(pConfig, pOrgStr, pIsDiffEditor, pDiffStr) {
        var search = false;
        var diff = pIsDiffEditor

        if (pConfig.buttonsStr && pConfig.buttonsStr.length > 0) {

            var container = $("<div></div>");
            container.addClass("apex-vs-monaco-editor-toolbar-container");
            container.css("border-bottom", "1px solid rgba(0,0,0,0.075)");

            if (pConfig.buttons.indexOf("undo") > -1) {
                var undoBtn = createButton("fa-solid fa-rotate-left");
                undoBtn.on("click", function () {
                    if (diff) {
                        editor.getOriginalEditor().getModel().undo();
                    } else {
                        editor.getModel().undo();
                    }
                });
                container.append(undoBtn);
            }

            if (pConfig.buttons.indexOf("redo") > -1) {
                var repeatBtn = createButton("fa-solid fa-rotate-right");
                repeatBtn.on("click", function () {
                    if (diff) {
                        editor.getOriginalEditor().getModel().redo();
                    } else {
                        editor.getModel().redo();
                    }
                });
                container.append(repeatBtn);
            }

            if (pConfig.buttons.indexOf("search") > -1) {
                var searchBtn = createButton("fa-search");
                searchBtn.on("click", function () {
                    var searchClass = "has-search-opened";
                    search = !search;
                    if (search) {
                        if (diff) {
                            editor.getOriginalEditor().getAction('actions.find').run();
                            editor.getModifiedEditor().getAction('actions.find').run();
                        } else {
                            editor.getAction('actions.find').run();
                        }
                    } else {
                        if (diff) {
                            editor.getOriginalEditor().trigger('keyboard', 'closeFindWidget');
                            editor.getModifiedEditor().trigger('keyboard', 'closeFindWidget');
                        } else {
                            editor.trigger('keyboard', 'closeFindWidget');
                        }
                    }
                });
                container.append(searchBtn);
            }

            if (pConfig.buttons.indexOf("diff") > -1) {
                var diffBtn = createPreviewButton("fa-solid fa-eye ", "previewBtn");
                diffBtn.on("click", function () {
                    search = false;
                    diff = !diff;
                    var str;
                    if (!diff) {
                        str = editor.getModel().original.getValue();
                        const editorDiv = document.querySelector('.apex-monaco-editor-container');
                        if (editorDiv) {
                            editorDiv.style.height = '100vh';
                        }
                        const previewDiv = document.querySelector('#preview');
                        if (previewDiv) {
                            previewDiv.style.display = 'none';
                        }
                        // fa eye
                        document.getElementById('previewBtn').classList.add('fa-eye');
                        document.getElementById('previewBtn').classList.remove('fa-edit');
                        
                    } else {
                        str = editor.getValue();
                        const editorDiv = document.querySelector('.apex-monaco-editor-container');
                        if (editorDiv) {
                            editorDiv.style.height = 'auto';
                        }
                        
                        const htmlContent = marked.marked(str); // Ensure `marked` library is included in your project

                        const previewDiv = document.getElementById('preview');
                        if (previewDiv) {
                            previewDiv.style.display = 'block';
                            previewDiv.innerHTML = htmlContent;
                        }
                        // previewDiv.id = 'preview';
                        // fa edit 
                        document.getElementById('previewBtn').classList.remove('fa-eye');
                        document.getElementById('previewBtn').classList.add('fa-edit');
                        
                        
                    }
                    editor.dispose();
                    initEditor(pConfig, str, diff, pDiffStr);
                });
                container.append(diffBtn);
            }

            if (pConfig.buttons.indexOf("save") > -1) {
                var saveBtn = createButton("fa-save save-button");
                saveBtn.on("click", function () {
                    var str;
                    if (diff) {
                        str = editor.getModel().original.getValue();
                    } else {
                        str = editor.getValue();
                    }
                    uploadFiles(pConfig, str);
                });
                container.append(saveBtn);
            }
            $(pConfig.regionSel).prepend(container);
        }

        /* trigger editor from outside to save the text */
        $(pConfig.regionIDRefreshSel).on("save", function () {
            var str;
            if (diff) {
                str = editor.getModel().original.getValue();
            } else {
                str = editor.getValue();
            }
            uploadFiles(pConfig, str);
        });
    }

    /***********************************************************************
     **
     ** function to init the monacoEditor
     **
     ***********************************************************************/
    function loadEditor(pData, pConfig) {
        var str;
        var strDiff;
        var isDiffEditor = false;
        if (util.isDefinedAndNotNull(pData)) {
            if (util.isDefinedAndNotNull(pData.rows)) {
                if (util.isDefinedAndNotNull(pData.rows[0])) {
                    if (util.isDefinedAndNotNull(pData.rows[0].VALUE_EDIT)) {
                        str = pData.rows[0].VALUE_EDIT;
                    }
                    if (util.isDefinedAndNotNull(pData.rows[0].VALUE_DIFF)) {
                        strDiff = pData.rows[0].VALUE_DIFF;
                        isDiffEditor = false;
                    } else {
                        strDiff = str;
                    }
                    if (util.isDefinedAndNotNull(pData.rows[0].LANGUAGE)) {
                        pConfig.language = pData.rows[0].LANGUAGE;
                    }
                }
            }
        }

        require.config({
            paths: {
                'vs': pConfig.path
            }
        });

        require(["vs/editor/editor.main"], function () {
            initEditor(pConfig, str, isDiffEditor, strDiff);
            addToolbar(pConfig, str, isDiffEditor, strDiff);
            util.loader.stop(pConfig.regionSel);
            $(pConfig.regionIDRefreshSel).trigger("rendered");
        });
    }

    /***********************************************************************
     **
     ** function to get data from APEX
     **
     ***********************************************************************/
    function getData(pConfig) {
        var submitItems = pConfig.items2Submit;
        util.loader.start(pConfig.regionSel);

        /* call apex server */
        apex.server.plugin(
            pConfig.ajaxID, {
            pageItems: submitItems,
            x01: 'GET',
        }, {
            success: function (pData) {
                apex.debug.info({
                    "fct": util.featureDetails.name + " - " + "getData",
                    "ajaxResponse": pData,
                    "featureDetails": util.featureDetails
                });
                loadEditor(pData, pConfig);

            },
            error: function (pData) {
                apex.debug.error({
                    "fct": util.featureDetails.name + " - " + "getData",
                    "ajaxResponse": pData,
                    "featureDetails": util.featureDetails
                });
                util.loader.stop(pConfig.regionSel);
            },
            dataType: "json"
        });
    }

    return {
        initialize: function (pRegionID, pRegionIDRefresh, pAjaxID, pItems2Submit, pPath, pHeight, pLanguage, pTheme, pButtons, pReadOnly) {


            apex.debug.info({
                "fct": util.featureDetails.name + " - " + "initialize",
                "arguments": {
                    "pRegionID": pRegionID,
                    "pRegionIDRefresh": pRegionIDRefresh,
                    "pAjaxID": pAjaxID,
                    "pItems2Submit": pItems2Submit,
                    "pPath": pPath,
                    "pHeight": pHeight,
                    "pLanguage": pLanguage,
                    "pTheme": pTheme,
                    "pButtons": pButtons
                },
                "featureDetails": util.featureDetails
            });
            gRegionID = pRegionID;
            var configJSON = {};
            configJSON.buttons = pButtons.split(":");
            configJSON.buttonsStr = pButtons;
            configJSON.height = pHeight || "50vh";
            configJSON.language = pLanguage || "plaintext";
            configJSON.theme = pTheme || "vs-dark";
            configJSON.regionID = pRegionID;
            configJSON.regionSel = "#" + pRegionID;
            configJSON.regionIDRefresh = pRegionIDRefresh;
            configJSON.regionIDRefreshSel = "#" + pRegionIDRefresh;
            configJSON.path = pPath;
            configJSON.ajaxID = pAjaxID;
            configJSON.readOnly = pReadOnly;
            configJSON.items2Submit = pItems2Submit;

            $(configJSON.regionSel).height(configJSON.height);
            $(configJSON.regionSel).css("border", "1px solid rgba(0,0,0,0.075)");
            $(configJSON.regionSel).css("overflow", "hidden");

            getData(configJSON);
            return editor;
        }
    }
};
