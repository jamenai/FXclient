import UglifyJS from "uglify-js";

const AST = UglifyJS;
const sameNumber = (left, right) => Math.abs(left - right) < 1e-9;
const setting = "__fx.settings.enhancedLobbyLayout";

function parseExpression(source) {
    return AST.parse(source).body[0].body;
}

function walkWithoutNestedFunctions(root, visit) {
    root.walk(new AST.TreeWalker(node => {
        if (node !== root && ["Function", "Arrow"].includes(node.TYPE)) return true;
        return visit(node);
    }));
}

function numberValues(node) {
    const values = [];
    node.walk(new AST.TreeWalker(current => {
        if (current.TYPE === "Number") values.push(current.value);
    }));
    return values;
}

function assertSingleNumber(node, value) {
    const count = numberValues(node).filter(number => sameNumber(number, value)).length;
    if (count !== 1) throw new Error(`Expected one ${value} literal, found ${count}`);
}

function replaceNumber(node, oldValue, expression) {
    const matches = [];
    node.walk(new AST.TreeWalker(current => {
        if (current.TYPE === "Number" && sameNumber(current.value, oldValue)) matches.push(current);
    }));
    if (matches.length !== 1) throw new Error(`Expected one ${oldValue} literal, found ${matches.length}`);

    let replaced = false;
    return node.transform(new AST.TreeTransformer(current => {
        if (!replaced && current === matches[0]) {
            replaced = true;
            return parseExpression(expression);
        }
    }));
}

function assignments(ast, predicate) {
    const matches = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE === "Assign" && predicate(node)) matches.push(node);
    }));
    return matches;
}

function isStyleAssignment(node, property) {
    return node.left?.TYPE === "Dot"
        && node.left.property === property
        && node.left.expression?.TYPE === "Dot"
        && node.left.expression.property === "style";
}

function getLobbyResize(ast) {
    const candidates = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "Assign" || node.operator !== "="
            || node.left.TYPE !== "Dot" || node.left.property !== "resize"
            || node.left.expression.TYPE !== "This" || node.right.TYPE !== "Function") return;

        const definitions = [];
        walkWithoutNestedFunctions(node.right, child => {
            if (child.TYPE === "VarDef" && child.value?.TYPE === "Call") {
                definitions.push({ node: child, values: numberValues(child.value) });
            }
        });
        const one = predicate => {
            const found = definitions.filter(({ values }) => predicate(values));
            return found.length === 1 ? found[0].node : null;
        };
        const targets = {
            resizeFunction: node.right,
            title: one(values => values.some(value => sameNumber(value, 0.05))),
            teamRow: one(values => values.some(value => sameNumber(value, 0.06)) && values.some(value => sameNumber(value, 0.03))),
            mapRow: one(values => values.some(value => sameNumber(value, 0.08)) && values.some(value => sameNumber(value, 0.03))),
            mapInfoRow: one(values => values.some(value => sameNumber(value, 0.04)) && values.some(value => sameNumber(value, 0.02))),
            footer: one(values => values.some(value => sameNumber(value, 0.02)) && values.some(value => sameNumber(value, 0.01))),
        };
        if (Object.values(targets).every(Boolean)) candidates.push(targets);
    }));
    if (candidates.length !== 1) throw new Error(`Expected one lobby resize function, found ${candidates.length}`);
    return candidates[0];
}

function patchHeights(ast) {
    const targets = getLobbyResize(ast);
    assertSingleNumber(targets.title.value, 0.05);
    assertSingleNumber(targets.teamRow.value, 0.06);
    assertSingleNumber(targets.teamRow.value, 0.03);
    assertSingleNumber(targets.mapRow.value, 0.08);
    assertSingleNumber(targets.mapRow.value, 0.03);
    assertSingleNumber(targets.mapInfoRow.value, 0.04);
    assertSingleNumber(targets.mapInfoRow.value, 0.02);
    assertSingleNumber(targets.footer.value, 0.02);
    assertSingleNumber(targets.footer.value, 0.01);
    targets.title.value = replaceNumber(targets.title.value, 0.05, `${setting} ? 0 : .05`);
    const needsExtraLobbyHeight = "window.innerWidth < window.innerHeight || window.innerWidth / window.innerHeight > 4";
    const lobbyFontScale = "Math.max(.75, Math.min(3, Number(__fx.settings.lobbyFontScale ?? 100) / 100))";
    targets.teamRow.value = replaceNumber(targets.teamRow.value, 0.06, `${setting} ? .085 * ${lobbyFontScale} : .06`);
    targets.teamRow.value = replaceNumber(targets.teamRow.value, 0.03, `${setting} ? (${needsExtraLobbyHeight} ? .025 : .02) * ${lobbyFontScale} : .03`);
    targets.mapRow.value = replaceNumber(targets.mapRow.value, 0.08, `${setting} ? (${needsExtraLobbyHeight} ? .06 : .04) : .08`);
    targets.mapRow.value = replaceNumber(targets.mapRow.value, 0.03, `${setting} ? (${needsExtraLobbyHeight} ? .025 : .02) : .03`);
    const mapInfoHeight = targets.mapInfoRow.value.args[0];
    const originalMapInfoHeight = mapInfoHeight.print_to_string();
    targets.mapInfoRow.value.args[0] = parseExpression(`${setting} ? (${originalMapInfoHeight}) * ${lobbyFontScale} : (${originalMapInfoHeight})`);

    const rowElement = row => {
        const variableName = row.name.name;
        const matches = assignments(targets.resizeFunction, node => isStyleAssignment(node, "height")
            && node.right.TYPE === "Call"
            && node.right.expression?.TYPE === "Dot"
            && node.right.expression.property === "sT"
            && node.right.args?.length === 1
            && node.right.args[0].TYPE === "SymbolRef"
            && node.right.args[0].name === variableName);
        let candidates = matches;
        if (candidates.length > 1) {
            candidates = candidates.filter(heightAssignment => {
                const elementName = heightAssignment.left.expression.expression.print_to_string();
                const topAssignment = assignments(targets.resizeFunction, node => isStyleAssignment(node, "top")
                    && node.left.expression.expression.print_to_string() === elementName);
                return topAssignment.some(node => {
                    let hasStackingOffset = false;
                    node.right.walk(new AST.TreeWalker(child => {
                        if (child.TYPE === "Binary" && child.operator === "+") hasStackingOffset = true;
                    }));
                    return hasStackingOffset;
                });
            });
        }
        if (candidates.length !== 1) throw new Error(`Expected one layout element for ${variableName}, found ${candidates.length}`);
        return candidates[0].left.expression.expression;
    };
    const scaleRowFonts = row => {
        const elementName = rowElement(row).print_to_string();
        const fontAssignments = assignments(targets.resizeFunction, node => isStyleAssignment(node, "font")
            && node.left.expression.expression.print_to_string() === elementName);
        if (fontAssignments.length === 0) throw new Error(`Expected font assignments for ${elementName}`);
        const scaledFont = expression => {
            if (expression.TYPE !== "Call" || expression.args.length < 2) return null;
            const clone = expression.clone(true);
            const lastArgument = clone.args.length - 1;
            clone.args[lastArgument] = parseExpression(`(${clone.args[lastArgument].print_to_string()}) * ${lobbyFontScale}`);
            return clone;
        };
        for (const assignment of fontAssignments) {
            let expression = scaledFont(assignment.right);
            if (!expression && assignment.right.TYPE === "SymbolRef") {
                const definitions = [];
                walkWithoutNestedFunctions(targets.resizeFunction, node => {
                    if (node.TYPE === "VarDef" && node.name.name === assignment.right.name && node.value?.TYPE === "Call") {
                        definitions.push(node.value);
                    }
                });
                if (definitions.length === 1) expression = scaledFont(definitions[0]);
            }
            if (expression) assignment.right = expression;
        }
    };
    scaleRowFonts(targets.mapInfoRow);
    scaleRowFonts(targets.teamRow);
    targets.footer.value = replaceNumber(targets.footer.value, 0.02, `${setting} ? .016 : .02`);
    targets.footer.value = replaceNumber(targets.footer.value, 0.01, `${setting} ? .007 : .01`);
}

function patchLobbyFlowLayout(ast) {
    const targets = getLobbyResize(ast);
    const resize = targets.resizeFunction;
    const elementForRow = row => {
        const variableName = row.name.name;
        const matches = assignments(resize, node => isStyleAssignment(node, "height")
            && node.right.TYPE === "Call"
            && node.right.expression?.TYPE === "Dot"
            && node.right.expression.property === "sT"
            && node.right.args?.length === 1
            && node.right.args[0].TYPE === "SymbolRef"
            && node.right.args[0].name === variableName);
        let candidates = matches;
        if (candidates.length > 1) {
            candidates = candidates.filter(heightAssignment => {
                const elementName = heightAssignment.left.expression.expression.print_to_string();
                const topAssignments = assignments(resize, node => isStyleAssignment(node, "top")
                    && node.left.expression.expression.print_to_string() === elementName);
                return topAssignments.some(node => {
                    let stacked = false;
                    node.right.walk(new AST.TreeWalker(child => {
                        if (child.TYPE === "Binary" && child.operator === "+") stacked = true;
                    }));
                    return stacked;
                });
            });
        }
        if (candidates.length !== 1) throw new Error(`Expected one flow row for ${variableName}, found ${candidates.length}`);
        return candidates[0].left.expression.expression;
    };

    const title = elementForRow(targets.title).print_to_string();
    const modeTabs = elementForRow(targets.mapRow).print_to_string();
    const currentMap = elementForRow(targets.mapInfoRow).print_to_string();
    const nextMap = elementForRow(targets.teamRow).print_to_string();
    const progress = elementForRow(targets.footer).print_to_string();
    const bodyAssignments = assignments(resize, node => isStyleAssignment(node, "height")
        && node.right.TYPE === "Call"
        && node.right.expression?.TYPE === "Dot"
        && node.right.expression.property === "sT"
        && node.right.args?.length === 1
        && (() => {
            let hasViewportRatio = false;
            node.right.args[0].walk(new AST.TreeWalker(child => {
                if (child.TYPE === "Binary" && child.operator === "/") hasViewportRatio = true;
            }));
            return hasViewportRatio;
        })());
    if (bodyAssignments.length !== 1) throw new Error(`Expected one lobby body row, found ${bodyAssignments.length}`);
    const body = bodyAssignments[0].left.expression.expression.print_to_string();

    const rowNames = new Set([title, modeTabs, currentMap, nextMap, progress]);
    const rootCounts = new Map();
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "Call" || node.expression?.TYPE !== "Dot"
            || node.expression.property !== "appendChild" || node.args?.length !== 1) return;
        const childName = node.args[0].print_to_string();
        if (!rowNames.has(childName)) return;
        const parentName = node.expression.expression.print_to_string();
        rootCounts.set(parentName, (rootCounts.get(parentName) ?? 0) + 1);
    }));
    const rootCandidates = [...rootCounts].filter(([, count]) => count === rowNames.size);
    if (rootCandidates.length !== 1) throw new Error(`Expected one lobby flow root, found ${rootCandidates.length}`);
    const root = rootCandidates[0][0];

    const modeResizeCalls = [];
    let activeViewResize = null;
    walkWithoutNestedFunctions(resize, node => {
        if (node.TYPE !== "Call" || node.expression?.TYPE !== "Dot" || node.expression.property !== "resize") return;
        if (node.args?.[0]?.print_to_string() === modeTabs
            && node.expression.expression?.TYPE !== "This") {
            modeResizeCalls.push(`${node.print_to_string()};`);
        }
    });
    for (const statement of resize.body) {
        if (statement.TYPE !== "If") continue;
        let resizesBody = false;
        walkWithoutNestedFunctions(statement, node => {
            if (node.TYPE === "Call" && node.expression?.TYPE === "Dot"
                && node.expression.property === "resize"
                && node.expression.expression?.TYPE === "Dot"
                && node.expression.expression.expression?.TYPE === "This"
                && node.args?.[0]?.print_to_string() === body) resizesBody = true;
        });
        if (resizesBody) {
            if (activeViewResize) throw new Error("Expected one active lobby view resize branch");
            activeViewResize = statement.print_to_string();
        }
    }
    if (modeResizeCalls.length !== 4 || !activeViewResize) {
        throw new Error(`Expected four mode resizes and one active view resize; found ${modeResizeCalls.length}`);
    }

    const flowLayout = `if (${setting}) {
        const __fxFlowRoot = ${root};
        const __fxFlowSections = Array.from(__fxFlowRoot.children);
        const __fxFlowExpected = [${title}, ${modeTabs}, ${currentMap}, ${nextMap}, ${body}, ${progress}];
        if (__fxFlowSections.length === 7
            && __fxFlowExpected.every((section, index) => __fxFlowSections[index] === section)) {
            const __fxFlowScale = Math.max(.75, Math.min(3, Number(__fx.settings.lobbyFontScale ?? 100) / 100));
            const __fxFlowSet = (element, property, value) => {
                if (element.style.getPropertyValue(property) !== value
                    || element.style.getPropertyPriority(property) !== "important") {
                    element.style.setProperty(property, value, "important");
                }
            };
            __fxFlowRoot.style.setProperty("display", "grid", "important");
            __fxFlowRoot.style.setProperty("grid-template-columns", "minmax(0, 1fr)", "important");
            __fxFlowRoot.style.setProperty("grid-template-rows",
                "0px max-content minmax(1.5em, 2.2em) minmax(1.5em, 2.2em) "
                + "minmax(0, 1fr) "
                + "12px minmax(2.8em, max-content)", "important");
            __fxFlowSections.forEach((section, index) => {
                __fxFlowSet(section, "position", "relative");
                __fxFlowSet(section, "top", "auto");
                __fxFlowSet(section, "right", "auto");
                __fxFlowSet(section, "bottom", "auto");
                __fxFlowSet(section, "left", "auto");
                __fxFlowSet(section, "width", "100%");
                __fxFlowSet(section, "height", "auto");
                __fxFlowSet(section, "max-height", "none");
                __fxFlowSet(section, "min-width", "0");
                __fxFlowSet(section, "box-sizing", "border-box");
                __fxFlowSet(section, "grid-row", String(index + 1));
            });
            [__fxFlowSections[2], __fxFlowSections[3]].forEach(section => {
                __fxFlowSet(section, "display", "flex");
                __fxFlowSet(section, "align-items", "center");
                __fxFlowSet(section, "justify-content", "center");
                __fxFlowSet(section, "flex-wrap", "wrap");
                __fxFlowSet(section, "column-gap", "1em");
                __fxFlowSet(section, "row-gap", ".15em");
                __fxFlowSet(section, "min-height", "max-content");
                for (const child of section.children) {
                    __fxFlowSet(child, "position", "static");
                    __fxFlowSet(child, "top", "auto");
                    __fxFlowSet(child, "right", "auto");
                    __fxFlowSet(child, "bottom", "auto");
                    __fxFlowSet(child, "left", "auto");
                    __fxFlowSet(child, "width", "auto");
                    __fxFlowSet(child, "height", "auto");
                    __fxFlowSet(child, "max-width", "100%");
                    __fxFlowSet(child, "min-width", "0");
                }
            });
            __fxFlowSet(__fxFlowSections[4], "min-height", "0");
            __fxFlowSet(__fxFlowSections[5], "height", "12px");
            __fxFlowSet(__fxFlowSections[5], "min-height", "12px");
            __fxFlowSet(__fxFlowSections[5], "max-height", "12px");
            __fxFlowSet(__fxFlowSections[5], "overflow", "visible");
            __fxFlowSet(__fxFlowSections[6], "min-height", "2.8em");
            __fxFlowSections[6].style.removeProperty("max-height");
            __fxFlowSet(__fxFlowSections[6], "padding-bottom", ".45em");
            ${modeResizeCalls.join("\n            ")}
            ${activeViewResize}
        }
    }`;
    resize.body.push(AST.parse(flowLayout).body[0]);
}

function patchPlayerCardSpacing(ast) {
    const matches = assignments(ast, node => isStyleAssignment(node, "margin")
        && node.right.TYPE === "String"
        && node.right.value === "0.2em 0.2em 0.2em 0.2em");
    if (matches.length !== 1) throw new Error(`Expected one player card margin, found ${matches.length}`);
    const original = matches[0].right.print_to_string();
    matches[0].right = parseExpression(`${setting} ? "0.05em 0.1em" : ${original}`);
}

function patchPlayerCardWidth(ast) {
    const hasResponsiveWidth = node => {
        if (!isStyleAssignment(node, "width") || node.right.TYPE !== "Assign") return false;
        const maxWidth = node.right;
        if (!isStyleAssignment(maxWidth, "maxWidth") || maxWidth.right.TYPE !== "Conditional") return false;
        const strings = [];
        maxWidth.right.walk(new AST.TreeWalker(child => {
            if (child.TYPE === "String") strings.push(child.value);
        }));
        return strings.includes("10em") && strings.includes("9em");
    };
    const matches = assignments(ast, hasResponsiveWidth);
    if (matches.length === 0) {
        const alreadyFullWidth = assignments(ast, node => isStyleAssignment(node, "width")
            && node.right.TYPE === "Assign" && isStyleAssignment(node.right, "maxWidth")
            && node.right.right.TYPE === "String" && node.right.right.value === "100%");
        if (alreadyFullWidth.length > 0) return;
    }
    if (matches.length !== 1) throw new Error(`Expected one responsive player card width, found ${matches.length}`);
    const maxWidth = matches[0].right;
    maxWidth.right = parseExpression(`${setting} ? "100%" : ${maxWidth.right.print_to_string()}`);
}

function patchSummaryFont(ast) {
    const matches = assignments(ast, node => {
        if (!isStyleAssignment(node, "fontSize")) return false;
        const values = numberValues(node.right);
        return values.some(value => sameNumber(value, 0.02)) && values.some(value => sameNumber(value, 0.3));
    });
    if (matches.length !== 1) throw new Error(`Expected one lobby summary font size, found ${matches.length}`);
    matches[0].right = replaceNumber(matches[0].right, 0.02, `${setting} ? .018 : .02`);
}

function containsString(node, value) {
    let found = false;
    node.walk(new AST.TreeWalker(child => {
        if (child.TYPE === "String" && child.value === value) found = true;
    }));
    return found;
}

function patchSummaryText(ast) {
    const matches = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "SimpleStatement" || node.body.TYPE !== "Assign") return;
        const assignment = node.body;
        if (assignment.left.TYPE !== "Dot" || assignment.left.property !== "textContent") return;
        if (["MP: ", "   SP: ", "   Lobby: "].every(label => containsString(assignment.right, label))) {
            matches.push({ statement: node, assignment });
        }
    }));
    if (matches.length !== 1) throw new Error(`Expected one lobby summary text assignment, found ${matches.length}`);
    const { statement, assignment } = matches[0];
    const firstSlot = assignment.left.clone(true);
    const slotIndices = [];
    firstSlot.walk(new AST.TreeWalker(node => {
        if (node.TYPE === "Sub" && node.property.TYPE === "Number" && node.property.value === 1) slotIndices.push(node.property);
    }));
    if (slotIndices.length !== 1) throw new Error(`Expected one summary slot index, found ${slotIndices.length}`);
    slotIndices[0].value = 0;

    const firstTarget = firstSlot.print_to_string();
    const summaryTarget = assignment.left.print_to_string();
    const summaryValue = assignment.right.print_to_string();
    statement.body = parseExpression(
        `${setting} ? (${firstTarget}=${summaryValue},${summaryTarget}="") : (${firstTarget}="Lobby",${summaryTarget}=${summaryValue})`
    );
}

function patchChatSpacing(ast) {
    const matches = assignments(ast, node => isStyleAssignment(node, "margin")
        && node.right.TYPE === "String" && node.right.value === "0.6em 0.6em");
    if (matches.length !== 1) throw new Error(`Expected one chat message margin, found ${matches.length}`);
    matches[0].right.value = "0.3em 0.6em";
}

function patchCurrentMapBold(ast) {
    const loops = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "For" || node.init?.TYPE !== "Var" || node.condition?.TYPE !== "Binary" || node.condition.operator !== "<") return;
        const indexName = node.init.definitions?.[0]?.name?.name;
        if (!indexName || node.condition.left?.name !== indexName || node.condition.right?.TYPE !== "Number" || node.condition.right.value !== 4) return;

        const labels = [];
        walkWithoutNestedFunctions(node.body, child => {
            if (child.TYPE !== "Assign" || child.left?.TYPE !== "Sub" || child.left.expression?.TYPE !== "SymbolRef"
                || child.left.property?.TYPE !== "SymbolRef" || child.right?.TYPE !== "New" || child.right.args?.length !== 4) return;
            const [mapName, button, one, anotherOne] = child.right.args;
            if (mapName.TYPE !== "Sub" || button.TYPE !== "Dot" || button.property !== "button"
                || one.TYPE !== "Number" || one.value !== 1 || anotherOne.TYPE !== "Number" || anotherOne.value !== 1) return;
            labels.push({
                arrayName: child.left.expression.name,
                indexName: child.left.property.name,
                buttonArray: button.expression.print_to_string()
            });
        });
        if (labels.length === 1) loops.push({ loop: node, indexName, ...labels[0] });
    }));
    if (loops.length !== 1) throw new Error(`Expected one current map label loop, found ${loops.length}`);

    const { loop, indexName, arrayName } = loops[0];
    const functions = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "Function") return;
        let containsLoop = false;
        walkWithoutNestedFunctions(node, child => { if (child === loop) containsLoop = true; });
        if (containsLoop) functions.push(node);
    }));
    if (functions.length !== 1) throw new Error(`Expected one map label update function, found ${functions.length}`);

    const selectedNames = new Set();
    walkWithoutNestedFunctions(functions[0], node => {
        if (node.TYPE === "VarDef" && node.value?.TYPE === "Sub" && node.value.property?.TYPE === "Number"
            && node.value.property.value === 0 && node.value.expression?.TYPE === "Dot") {
            selectedNames.add(node.name.name);
        }
    });
    if (selectedNames.size !== 1) throw new Error(`Expected one selected game mode index, found ${selectedNames.size}`);

    if (loop.body.TYPE !== "BlockStatement") throw new Error("Current map label loop body is not a block");
    const mapLabelElements = [];
    walkWithoutNestedFunctions(loop.body, node => {
        if (node.TYPE !== "Assign" || node.left?.TYPE !== "Dot" || node.left.property !== "textContent") return;
        const element = node.left.expression;
        const labelIndex = element?.TYPE === "Dot" ? element.expression : null;
        if (labelIndex?.TYPE !== "Sub" || labelIndex.expression?.TYPE !== "SymbolRef"
            || labelIndex.expression.name !== arrayName || labelIndex.property?.TYPE !== "SymbolRef"
            || labelIndex.property.name !== indexName) return;
        mapLabelElements.push(element);
    });
    if (mapLabelElements.length !== 1) {
        throw new Error(`Expected one current map label element, found ${mapLabelElements.length}`);
    }

    const selectedName = [...selectedNames][0];
    loop.body.body.push(AST.parse(
        `if (${mapLabelElements[0].print_to_string()} && ${mapLabelElements[0].print_to_string()}.style) {
            ${mapLabelElements[0].print_to_string()}.style.setProperty("font-weight", ${indexName} === ${selectedName} ? "700" : "normal", "important");
        }`
    ).body[0]);
    const selectedButton = loops[0].buttonArray.replace(/\[[^\]]+\]$/, `[${indexName}]`);
    loop.body.body.push(AST.parse(
        `${selectedButton}.button.style.setProperty("font-weight", ${indexName} === ${selectedName} ? "700" : "", "important");`
    ).body[0]);

    const lobbyShowMethods = [];
    ast.walk(new AST.TreeWalker(node => {
        if (node.TYPE !== "Assign" || node.left?.TYPE !== "Dot" || node.left.property !== "show"
            || node.left.expression?.TYPE !== "This" || node.right?.TYPE !== "Function") return;
        let resizesLobby = false;
        let showsLobbyMessage = false;
        walkWithoutNestedFunctions(node.right, child => {
            if (child.TYPE === "Call" && child.expression?.TYPE === "Dot"
                && child.expression.expression?.TYPE === "This" && child.expression.property === "resize") {
                resizesLobby = true;
            }
            if (child.TYPE === "Call" && child.expression?.TYPE === "Dot" && child.expression.property === "show"
                && child.expression.expression?.TYPE === "Dot" && child.expression.expression.property === "message") {
                showsLobbyMessage = true;
            }
        });
        if (resizesLobby && showsLobbyMessage) lobbyShowMethods.push(node.right);
    }));
    if (lobbyShowMethods.length !== 1) {
        throw new Error(`Expected one lobby show method, found ${lobbyShowMethods.length}`);
    }
    const lobbyButtons = loops[0].buttonArray.replace(/\[[^\]]+\]$/, "[__fxLobbyTabIndex]");
    lobbyShowMethods[0].body.push(AST.parse(`
        (() => {
            const __fxLobbyTabStorageKey = "fxclient:lobby-last-tab:v1";
            const __fxLobbyTabButtons = [0, 1, 2, 3].map(__fxLobbyTabIndex => ${lobbyButtons}.button);
            __fxLobbyTabButtons.forEach((__fxLobbyTabButton, __fxLobbyTabIndex) => {
                if (__fxLobbyTabButton.dataset.fxLobbyTabPersistence === "true") return;
                __fxLobbyTabButton.dataset.fxLobbyTabPersistence = "true";
                __fxLobbyTabButton.addEventListener("click", () => {
                    try { localStorage.setItem(__fxLobbyTabStorageKey, String(__fxLobbyTabIndex)); } catch {}
                });
            });
            try {
                const __fxSavedLobbyTab = localStorage.getItem(__fxLobbyTabStorageKey);
                const __fxSavedLobbyTabIndex = Number(__fxSavedLobbyTab);
                if (__fxSavedLobbyTab !== null && Number.isInteger(__fxSavedLobbyTabIndex)
                    && __fxSavedLobbyTabIndex >= 0 && __fxSavedLobbyTabIndex < __fxLobbyTabButtons.length) {
                    __fxLobbyTabButtons[__fxSavedLobbyTabIndex].click();
                }
            } catch {}
        })();
    `).body[0]);
}

/** Apply independently guarded lobby AST transforms; identifiers can change between minified builds. */
export function patchLobbyLayout(script) {
    const ast = AST.parse(script);
    const results = [];
    const apply = (id, transform) => {
        transform(ast);
        results.push({ id, applied: true });
    };

    apply("lobby-flow-layout-ast", patchLobbyFlowLayout);
    apply("lobby-heights-ast", patchHeights);
    apply("player-card-spacing-ast", patchPlayerCardSpacing);
    apply("player-card-width-ast", patchPlayerCardWidth);
    apply("lobby-summary-font-ast", patchSummaryFont);
    apply("lobby-summary-text-ast", patchSummaryText);
    apply("chat-message-spacing-ast", patchChatSpacing);
    apply("current-map-bold-ast", patchCurrentMapBold);
    results.push({ id: "lobby-tab-persistence-ast", applied: true });
    return { script: ast.print_to_string(), results };
}
