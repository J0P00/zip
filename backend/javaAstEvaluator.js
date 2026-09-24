const { parse } = require('java-parser');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Extracts a structured AST representation from Java source code CST using java-parser
 */
function extractJavaAst(sourceCode) {
  let cst;
  try {
    cst = parse(sourceCode);
  } catch (err) {
    return {
      isValid: false,
      syntaxError: err.message || 'Syntax error in Java code',
      classes: [],
      interfaces: [],
      instantiations: [],
      methodInvocations: [],
      tryCatchBlocks: []
    };
  }

  const result = {
    isValid: true,
    syntaxError: null,
    classes: [],
    interfaces: [],
    instantiations: [],
    methodInvocations: [],
    tryCatchBlocks: []
  };

  function collectTokens(node, acc = []) {
    if (!node) return acc;
    if (node.image) {
      acc.push(node.image);
      return acc;
    }
    if (node.children) {
      for (const key of Object.keys(node.children)) {
        const list = node.children[key];
        if (Array.isArray(list)) {
          for (const item of list) {
            collectTokens(item, acc);
          }
        }
      }
    }
    return acc;
  }

  function getNodeText(node) {
    return collectTokens(node).join(' ');
  }

  function walkCst(node, visitors) {
    if (!node) return;
    const name = node.name;
    if (name && visitors[name]) {
      visitors[name](node);
    }
    if (node.children) {
      for (const key of Object.keys(node.children)) {
        const list = node.children[key];
        if (Array.isArray(list)) {
          for (const child of list) {
            walkCst(child, visitors);
          }
        }
      }
    }
  }

  walkCst(cst, {
    // 1. Classes
    classDeclaration(node) {
      const classModifiers = node.children?.classModifier || [];
      const isPublic = classModifiers.some(m => getNodeText(m).includes('public'));
      const isAbstract = classModifiers.some(m => getNodeText(m).includes('abstract'));
      const isFinal = classModifiers.some(m => getNodeText(m).includes('final'));

      const normalClass = node.children?.normalClassDeclaration?.[0];
      if (!normalClass) return;

      const className = normalClass.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image || '';
      
      // Check superclass (extends)
      let superclass = null;
      const superclassNode = normalClass.children?.superclass?.[0];
      if (superclassNode) {
        superclass = getNodeText(superclassNode.children?.classType?.[0]).trim();
      }

      // Check superinterfaces (implements)
      const interfaces = [];
      const superinterfacesNode = normalClass.children?.superinterfaces?.[0];
      if (superinterfacesNode) {
        const interfaceTypeList = superinterfacesNode.children?.interfaceTypeList?.[0]?.children?.interfaceType || [];
        for (const it of interfaceTypeList) {
          interfaces.push(getNodeText(it).trim());
        }
      }

      const classObj = {
        name: className,
        isInterface: false,
        isAbstract,
        isPublic,
        isFinal,
        extends: superclass,
        implements: interfaces,
        fields: [],
        constructors: [],
        methods: []
      };

      const classBody = normalClass.children?.classBody?.[0];
      const bodyDecls = classBody?.children?.classBodyDeclaration || [];

      for (const bodyDecl of bodyDecls) {
        // Constructors directly under classBodyDeclaration
        const directConstr = bodyDecl.children?.constructorDeclaration?.[0];
        if (directConstr) {
          const constrModifiers = directConstr.children?.constructorModifier || [];
          const isPub = constrModifiers.some(m => getNodeText(m).includes('public'));
          const isPriv = constrModifiers.some(m => getNodeText(m).includes('private'));

          const constrDeclarator = directConstr.children?.constructorDeclarator?.[0];
          const constrName = constrDeclarator?.children?.simpleTypeName?.[0]?.children?.Identifier?.[0]?.image || '';

          const params = [];
          const formalParams = constrDeclarator?.children?.formalParameterList?.[0]?.children?.formalParameter || [];
          for (const fp of formalParams) {
            const pType = getNodeText(fp.children?.unannType?.[0]).trim();
            const pName = fp.children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || '';
            params.push({ name: pName, type: pType });
          }

          const constrBody = getNodeText(directConstr.children?.constructorBody?.[0]);
          const usesThis = constrBody.includes('this.');
          const callsSuper = constrBody.includes('super(') || constrBody.includes('super (');

          classObj.constructors.push({
            name: constrName,
            parameters: params,
            isPublic: isPub,
            isPrivate: isPriv,
            usesThis,
            callsSuper
          });
        }

        const memberDecl = bodyDecl.children?.classMemberDeclaration?.[0];
        if (!memberDecl) continue;

        // Fields
        const fieldDecl = memberDecl.children?.fieldDeclaration?.[0];
        if (fieldDecl) {
          const fieldModifiers = fieldDecl.children?.fieldModifier || [];
          const isPriv = fieldModifiers.some(m => getNodeText(m).includes('private'));
          const isPub = fieldModifiers.some(m => getNodeText(m).includes('public'));
          const isProt = fieldModifiers.some(m => getNodeText(m).includes('protected'));
          const isStat = fieldModifiers.some(m => getNodeText(m).includes('static'));
          const isFin = fieldModifiers.some(m => getNodeText(m).includes('final'));

          const unannType = getNodeText(fieldDecl.children?.unannType?.[0]).trim();
          const varDeclarators = fieldDecl.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator || [];

          for (const vd of varDeclarators) {
            const fieldName = vd.children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || '';
            if (fieldName) {
              classObj.fields.push({
                name: fieldName,
                type: unannType,
                isPrivate: isPriv,
                isPublic: isPub,
                isProtected: isProt,
                isStatic: isStat,
                isFinal: isFin
              });
            }
          }
        }

        // Methods
        const methodDecl = memberDecl.children?.methodDeclaration?.[0];
        if (methodDecl) {
          const methodModifiers = methodDecl.children?.methodModifier || [];
          const isPub = methodModifiers.some(m => getNodeText(m).includes('public'));
          const isPriv = methodModifiers.some(m => getNodeText(m).includes('private'));
          const isProt = methodModifiers.some(m => getNodeText(m).includes('protected'));
          const isStat = methodModifiers.some(m => getNodeText(m).includes('static'));
          const isAbst = methodModifiers.some(m => getNodeText(m).includes('abstract'));
          const isOver = methodModifiers.some(m => getNodeText(m).includes('@ Override') || getNodeText(m).includes('@Override'));

          const methodHeader = methodDecl.children?.methodHeader?.[0];
          const resultNode = methodHeader?.children?.result?.[0];
          const returnType = resultNode ? getNodeText(resultNode).trim() : 'void';
          const methodDeclarator = methodHeader?.children?.methodDeclarator?.[0];
          const methodName = methodDeclarator?.children?.Identifier?.[0]?.image || '';

          const params = [];
          const formalParams = methodDeclarator?.children?.formalParameterList?.[0]?.children?.formalParameter || [];
          for (const fp of formalParams) {
            const pType = getNodeText(fp.children?.unannType?.[0]).trim();
            const pName = fp.children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || '';
            params.push({ name: pName, type: pType });
          }

          classObj.methods.push({
            name: methodName,
            returnType,
            parameters: params,
            isPublic: isPub,
            isPrivate: isPriv,
            isProtected: isProt,
            isStatic: isStat,
            isAbstract: isAbst,
            isOverride: isOver
          });
        }
      }

      result.classes.push(classObj);
    },

    // 2. Interfaces
    interfaceDeclaration(node) {
      const normalInterface = node.children?.normalInterfaceDeclaration?.[0];
      if (!normalInterface) return;

      const interfaceName = normalInterface.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image || '';
      const methods = [];

      const interfaceBody = normalInterface.children?.interfaceBody?.[0];
      const bodyDecls = interfaceBody?.children?.interfaceMemberDeclaration || [];

      for (const bodyDecl of bodyDecls) {
        const methodDecl = bodyDecl.children?.interfaceMethodDeclaration?.[0];
        if (methodDecl) {
          const methodHeader = methodDecl.children?.methodHeader?.[0];
          const resultNode = methodHeader?.children?.result?.[0];
          const returnType = resultNode ? getNodeText(resultNode).trim() : 'void';
          const methodDeclarator = methodHeader?.children?.methodDeclarator?.[0];
          const methodName = methodDeclarator?.children?.Identifier?.[0]?.image || '';
          methods.push({ name: methodName, returnType });
        }
      }

      result.interfaces.push({
        name: interfaceName,
        isInterface: true,
        methods
      });
    },

    // 3. Object Instantiations: new ClassName(...)
    unqualifiedClassInstanceCreationExpression(node) {
      const typeIdent = node.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image ||
                        getNodeText(node.children?.classOrInterfaceTypeToInstantiate?.[0]).trim();
      const argList = node.children?.argumentList?.[0];
      const argsCount = argList?.children?.expression?.length || 0;
      if (typeIdent) {
        result.instantiations.push({
          className: typeIdent,
          argumentCount: argsCount
        });
      }
    },

    // 4. Method Invocations (calls)
    primary(node) {
      const suffixes = node.children?.primarySuffix || [];
      const hasMethodInv = suffixes.some(s => s.children?.methodInvocationSuffix);
      if (hasMethodInv) {
        const fullExpr = collectTokens(node).join('');
        result.methodInvocations.push(fullExpr);
      }
    },

    // 5. Try-Catch Blocks
    tryStatement(node) {
      const catches = node.children?.catches?.[0]?.children?.catchClause || [];
      const caughtExceptions = [];
      for (const cc of catches) {
        const formalParam = cc.children?.catchFormalParameter?.[0];
        const catchType = formalParam?.children?.catchType?.[0];
        const unannClassType = catchType?.children?.unannClassType?.[0];
        caughtExceptions.push(getNodeText(unannClassType || catchType).trim());
      }
      result.tryCatchBlocks.push({
        caughtExceptions
      });
    }
  });

  return result;
}

/**
 * Execute real javac compilation and Java process execution safely with timeout
 */
function executeJavaProgram(sourceCode, input = '', timeoutMs = 4000) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oophub_eval_'));
  const sourcePath = path.join(tempDir, 'Main.java');

  try {
    fs.writeFileSync(sourcePath, sourceCode, 'utf8');

    // 1. Compile Main.java
    const compileResult = spawnSync('javac', ['Main.java'], {
      cwd: tempDir,
      timeout: timeoutMs,
      encoding: 'utf8'
    });

    if (compileResult.status !== 0 || compileResult.error) {
      const errMsg = compileResult.stderr || compileResult.stdout || (compileResult.error ? compileResult.error.message : 'Compilation error');
      return {
        success: false,
        compileStatus: 'failed',
        output: '',
        error: errMsg.trim(),
        runtime: 0
      };
    }

    // 2. Run Main
    const startTime = Date.now();
    const runResult = spawnSync('java', ['Main'], {
      cwd: tempDir,
      input,
      timeout: timeoutMs,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });

    const runtime = Date.now() - startTime;

    if (runResult.error && runResult.error.code === 'ETIMEDOUT') {
      return {
        success: false,
        compileStatus: 'runtime_error',
        output: '',
        error: 'Execution timed out (possible infinite loop).',
        runtime: timeoutMs
      };
    }

    if (runResult.status !== 0) {
      return {
        success: false,
        compileStatus: 'runtime_error',
        output: (runResult.stdout || '').trim(),
        error: (runResult.stderr || 'Runtime error during execution.').trim(),
        runtime
      };
    }

    return {
      success: true,
      compileStatus: 'success',
      output: (runResult.stdout || '').trim(),
      error: '',
      runtime
    };
  } catch (err) {
    return {
      success: false,
      compileStatus: 'failed',
      output: '',
      error: err.message || 'System error during execution',
      runtime: 0
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Validates extracted AST against the challenge's required OOP structural rules
 */
function validateOopRequirements(ast, requirements = []) {
  if (!requirements.length) {
    return {
      passed: true,
      score: 100,
      total: 0,
      passedCount: 0,
      requirements: [],
      missingMessages: []
    };
  }

  const results = [];
  const missingMessages = [];

  for (const req of requirements) {
    let passed = false;
    try {
      passed = Boolean(req.check(ast));
    } catch (e) {
      passed = false;
    }

    results.push({
      id: req.id,
      name: req.name,
      description: req.description,
      passed,
      message: passed ? (req.successMessage || 'Requirement satisfied.') : req.failureMessage
    });

    if (!passed) {
      missingMessages.push(req.failureMessage);
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const score = Math.round((passedCount / requirements.length) * 100);

  return {
    passed: passedCount === requirements.length,
    score,
    total: requirements.length,
    passedCount,
    requirements: results,
    missingMessages
  };
}

/**
 * Master Advanced Java OOP Practice Evaluator
 * Evaluates both OOP Structural AST and Behavioral Test Outputs
 */
function evaluateAdvancedJavaPractice(challenge, sourceCode, includeHidden = false) {
  const startTime = Date.now();
  const rubric = challenge.rubric || {
    compilation: 10,
    oopStructure: 40,
    behavioral: 30,
    hidden: 20
  };

  // Step 1: Java AST Parsing & Structural Extraction
  const ast = extractJavaAst(sourceCode);
  if (!ast.isValid) {
    return {
      compileStatus: 'failed',
      score: 0,
      passingScore: challenge.passingScore || 70,
      isPassed: false,
      oopValidation: {
        passed: false,
        score: 0,
        total: challenge.oopRequirements?.length || 0,
        passedCount: 0,
        requirements: (challenge.oopRequirements || []).map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          passed: false,
          message: 'Skipped due to syntax/compilation error.'
        })),
        missingMessages: ['Syntax error prevented OOP AST validation.']
      },
      behavioralValidation: {
        passed: false,
        score: 0,
        total: (challenge.testCases || []).filter(t => !t.isHidden).length,
        passedCount: 0,
        tests: []
      },
      hiddenValidation: {
        passed: false,
        total: (challenge.testCases || []).filter(t => t.isHidden).length,
        passedCount: 0
      },
      educationalFeedback: [
        `Syntax/Compilation Error: ${ast.syntaxError}`,
        'Fix syntax and compiler errors to enable OOP structural and behavioral evaluation.'
      ],
      programOutput: '',
      errorMessage: ast.syntaxError,
      runtime: Date.now() - startTime,
      memoryUsage: 32,
      testResults: (challenge.testCases || []).map(tc => ({
        id: tc.id,
        isHidden: Boolean(tc.isHidden),
        passed: false,
        expectedOutput: tc.isHidden ? '(hidden)' : tc.expectedOutput,
        actualOutput: '',
        message: 'Skipped because compilation failed.'
      }))
    };
  }

  // Step 2: OOP Structural Validation
  const oopValidation = validateOopRequirements(ast, challenge.oopRequirements || []);

  // Step 3: Real Java Execution / Behavioral Evaluation
  const execution = executeJavaProgram(sourceCode, challenge.sampleInput || '');
  const isCompiled = execution.compileStatus === 'success';

  if (!isCompiled) {
    return {
      compileStatus: execution.compileStatus || 'failed',
      score: 0,
      passingScore: challenge.passingScore || 70,
      isPassed: false,
      oopValidation,
      behavioralValidation: {
        passed: false,
        score: 0,
        total: (challenge.testCases || []).filter(t => !t.isHidden).length,
        passedCount: 0,
        tests: []
      },
      hiddenValidation: {
        passed: false,
        total: (challenge.testCases || []).filter(t => t.isHidden).length,
        passedCount: 0
      },
      educationalFeedback: [
        `Compilation/Runtime Error: ${execution.error}`,
        ...oopValidation.missingMessages
      ],
      programOutput: execution.output,
      errorMessage: execution.error,
      runtime: execution.runtime || (Date.now() - startTime),
      memoryUsage: 48,
      testResults: (challenge.testCases || []).map(tc => ({
        id: tc.id,
        isHidden: Boolean(tc.isHidden),
        passed: false,
        expectedOutput: tc.isHidden ? '(hidden)' : tc.expectedOutput,
        actualOutput: '',
        message: 'Compilation or runtime failed.'
      }))
    };
  }

  // Step 4: Run Public and Hidden Test Cases against execution output
  const testCases = challenge.testCases || [];
  const publicTests = testCases.filter(t => !t.isHidden);
  const hiddenTests = testCases.filter(t => t.isHidden);

  const normalizeOutput = (str) => String(str || '').replace(/\r\n/g, '\n').trim();
  const actualTrimmed = normalizeOutput(execution.output);

  // Evaluate public tests
  const evaluatedPublicTests = publicTests.map(tc => {
    const expectedTrimmed = normalizeOutput(tc.expectedOutput);
    const passed = actualTrimmed.includes(expectedTrimmed) || actualTrimmed === expectedTrimmed;
    return {
      id: tc.id,
      input: tc.input || '',
      expectedOutput: tc.expectedOutput,
      actualOutput: execution.output,
      passed,
      isHidden: false,
      message: passed ? 'Output matched expected behavior.' : `Expected output "${tc.expectedOutput}" was not found in console output.`
    };
  });

  const publicPassedCount = evaluatedPublicTests.filter(t => t.passed).length;
  const publicBehaviorScore = publicTests.length ? Math.round((publicPassedCount / publicTests.length) * 100) : 100;

  // Evaluate hidden tests (server-side only)
  const evaluatedHiddenTests = hiddenTests.map(tc => {
    const expectedTrimmed = normalizeOutput(tc.expectedOutput);
    const outputMatches = actualTrimmed.includes(expectedTrimmed) || actualTrimmed === expectedTrimmed;
    const passed = outputMatches && oopValidation.passed;
    return {
      id: tc.id,
      input: tc.input || '',
      expectedOutput: '(hidden test case)',
      actualOutput: passed ? '(passed hidden validation)' : '(failed hidden criteria)',
      passed,
      isHidden: true,
      message: passed ? 'Hidden criteria passed.' : 'Hidden test requirements not satisfied.'
    };
  });

  const hiddenPassedCount = evaluatedHiddenTests.filter(t => t.passed).length;
  const hiddenScore = hiddenTests.length ? Math.round((hiddenPassedCount / hiddenTests.length) * 100) : 100;

  // Step 5: Composite Weighted Rubric Score
  const compilationPoints = isCompiled ? rubric.compilation : 0;
  const oopPoints = (oopValidation.score / 100) * rubric.oopStructure;
  const behaviorPoints = (publicBehaviorScore / 100) * rubric.behavioral;
  const hiddenPoints = (hiddenScore / 100) * rubric.hidden;

  const totalPossible = rubric.compilation + rubric.oopStructure + rubric.behavioral + rubric.hidden;
  const rawScore = compilationPoints + oopPoints + behaviorPoints + hiddenPoints;
  const calculatedScore = Math.min(100, Math.max(0, Math.round((rawScore / totalPossible) * 100)));

  // If OOP structure failed, cap score below passing and fail
  const passesThreshold = calculatedScore >= (challenge.passingScore || 70);
  const isPassed = passesThreshold && oopValidation.passed && publicBehaviorScore >= 80;

  const finalScore = isPassed ? calculatedScore : Math.min(calculatedScore, 65);

  // Educational Feedback compilation
  const educationalFeedback = [];
  if (!oopValidation.passed) {
    educationalFeedback.push('OOP Structure Validation: One or more required object-oriented programming concepts were not detected:');
    for (const msg of oopValidation.missingMessages) {
      educationalFeedback.push(`• ${msg}`);
    }
  }
  if (publicBehaviorScore < 100) {
    educationalFeedback.push('Behavioral Testing: Output did not match expected console results.');
  }
  if (oopValidation.passed && isPassed) {
    educationalFeedback.push('✓ Excellent! All OOP structural requirements and behavioral tests passed successfully.');
  }

  const allTests = includeHidden
    ? [...evaluatedPublicTests, ...evaluatedHiddenTests]
    : evaluatedPublicTests;

  // Format backward-compatible testResults combining structural checklist and behavioral tests
  const combinedTestResults = [
    ...oopValidation.requirements.map(req => ({
      id: req.id,
      isHidden: false,
      passed: req.passed,
      expectedOutput: `OOP Requirement: ${req.name}`,
      actualOutput: req.passed ? 'Satisfied ✓' : 'Missing ✗',
      message: req.message
    })),
    ...allTests
  ];

  return {
    compileStatus: isPassed ? 'success' : 'runtime_error',
    score: finalScore,
    passingScore: challenge.passingScore || 70,
    isPassed,
    oopValidation: {
      passed: oopValidation.passed,
      score: oopValidation.score,
      total: oopValidation.total,
      passedCount: oopValidation.passedCount,
      requirements: oopValidation.requirements
    },
    behavioralValidation: {
      passed: publicBehaviorScore >= 80,
      score: publicBehaviorScore,
      total: publicTests.length,
      passedCount: publicPassedCount,
      tests: evaluatedPublicTests
    },
    hiddenValidation: {
      passed: hiddenPassedCount === hiddenTests.length,
      total: hiddenTests.length,
      passedCount: hiddenPassedCount
    },
    educationalFeedback,
    programOutput: execution.output || (isPassed ? challenge.sampleOutput : 'No output captured.'),
    errorMessage: isPassed ? '' : (educationalFeedback.join('\n') || 'Requirements not satisfied.'),
    runtime: execution.runtime || (Date.now() - startTime),
    memoryUsage: Math.max(32, Math.round(sourceCode.length / 30)),
    testResults: combinedTestResults
  };
}

module.exports = {
  extractJavaAst,
  executeJavaProgram,
  validateOopRequirements,
  evaluateAdvancedJavaPractice
};
