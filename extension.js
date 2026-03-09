const vscode=require('vscode');

const CHUNK_START=/^```\{r.*?\}/;
const CHUNK_END=/^```\s*$/;

function tryAcquirePositronApi() {
  if(typeof acquirePositronApi!=='undefined') {
    return acquirePositronApi();
  }
  return undefined;
}

function findChunkBounds(document,cursorLine) {
  let startLine=null;
  let endLine=null;

  for(let i=cursorLine;i>=0;i--) {
    const text=document.lineAt(i).text;
    if(CHUNK_START.test(text)) {startLine=i; break;}
    if(i<cursorLine&&CHUNK_END.test(text)) return null;
  }

  if(startLine===null) return null;

  for(let i=cursorLine;i<document.lineCount;i++) {
    const text=document.lineAt(i).text;
    if(i>startLine&&CHUNK_END.test(text)) {endLine=i; break;}
  }

  if(endLine===null) return null;
  return {startLine,endLine};
}

function centerCursor(editor) {
  const pos=editor.selection.active;
  editor.revealRange(
    new vscode.Range(pos,pos),
    vscode.TextEditorRevealType.InCenter
  );
}

function resolveWord(editor) {
  const doc=editor.document;
  const sel=editor.selection;

  if(!sel.isEmpty) {
    return doc.getText(sel).trim();
  }

  const wordRange=doc.getWordRangeAtPosition(sel.active,/[\w.]+/);
  if(!wordRange) return null;
  return doc.getText(wordRange);
}

// Strip trailing pipes (%>% or |>) including surrounding whitespace/newlines
function stripTrailingPipes(code) {
  return code.replace(/\s*(%>%|\|>)\s*$/g,'').trim();
}

// Shared helper: execute R code via Positron API, fallback to terminal
async function executeRCode(code) {
  // Strategy 1: Positron native global API
  const positron=tryAcquirePositronApi();
  if(positron) {
    try {
      await positron.runtime.executeCode('r',code,true,false);
      return;
    } catch(err) {
      console.error('positron.runtime.executeCode failed:',err);
    }
  }

  // Strategy 2: Positron built-in command fallback
  try {
    await vscode.commands.executeCommand(
      'workbench.action.executeCode.console',
      {langId: 'r',code,focus: false}
    );
    return;
  } catch(err) {
    console.error('workbench.action.executeCode.console failed:',err);
  }

  // Strategy 3: Last resort — send to any R terminal
  let terminal=vscode.window.terminals.find(
    t => t.name==='R'||t.name.startsWith('R ')
  );
  if(!terminal) {
    terminal=vscode.window.createTerminal('R');
    terminal.show(true);
    await new Promise(resolve => setTimeout(resolve,1500));
  }
  terminal.sendText(code);
}

function activate(context) {

  // Ctrl+S → Select whole chunk INCLUDING the ```{r} and ``` fences
  context.subscriptions.push(
    vscode.commands.registerCommand('rChunk.selectWholeChunk',() => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const doc=editor.document;
      const cursorLine=editor.selection.active.line;
      const bounds=findChunkBounds(doc,cursorLine);

      if(!bounds) {
        vscode.window.showInformationMessage('Cursor is not inside an R chunk.');
        return;
      }

      const start=new vscode.Position(bounds.startLine,0);
      const end=new vscode.Position(bounds.endLine,doc.lineAt(bounds.endLine).text.length);

      editor.selection=new vscode.Selection(start,end);
      editor.revealRange(new vscode.Range(start,end));
    })
  );

  // Ctrl+A → Move cursor to beginning of first content line, then center
  context.subscriptions.push(
    vscode.commands.registerCommand('rChunk.moveToChunkStart',() => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const bounds=findChunkBounds(editor.document,editor.selection.active.line);

      if(!bounds) {
        vscode.window.showInformationMessage('Cursor is not inside an R chunk.');
        return;
      }

      const pos=new vscode.Position(bounds.startLine+1,0);
      editor.selection=new vscode.Selection(pos,pos);
      centerCursor(editor);
    })
  );

  // Ctrl+E → Move cursor to beginning of last content line, then center
  context.subscriptions.push(
    vscode.commands.registerCommand('rChunk.moveToChunkEnd',() => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const doc=editor.document;
      const bounds=findChunkBounds(doc,editor.selection.active.line);

      if(!bounds) {
        vscode.window.showInformationMessage('Cursor is not inside an R chunk.');
        return;
      }

      const lastContentLine=bounds.endLine-1;
      const pos=new vscode.Position(lastContentLine,0);

      editor.selection=new vscode.Selection(pos,pos);
      centerCursor(editor);
    })
  );

  // Ctrl+W → Select the whole word at the current cursor position
  context.subscriptions.push(
    vscode.commands.registerCommand('r.selectWord',() => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const doc=editor.document;
      const position=editor.selection.active;
      const wordRange=doc.getWordRangeAtPosition(position,/[\w.]+/);

      if(!wordRange) {
        vscode.window.showInformationMessage('No word found at cursor.');
        return;
      }

      editor.selection=new vscode.Selection(wordRange.start,wordRange.end);
    })
  );

  // Cmd+U → Run View(<word or selection>) in the Positron R console
  context.subscriptions.push(
    vscode.commands.registerCommand('r.viewObject',async () => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const word=resolveWord(editor);

      if(!word) {
        vscode.window.showInformationMessage('No word or selection found at cursor.');
        return;
      }

      await executeRCode(`View(${word})`);
    })
  );

  // Cmd+H → Run head(<word or selection>) in the Positron R console,
  //         strip trailing pipes, then return focus to the editor
  context.subscriptions.push(
    vscode.commands.registerCommand('r.headObject',async () => {
      const editor=vscode.window.activeTextEditor;
      if(!editor) return;

      const raw=resolveWord(editor);

      if(!raw) {
        vscode.window.showInformationMessage('No word or selection found at cursor.');
        return;
      }

      // Strip trailing %> % or |> before wrapping in head()
      const clean=stripTrailingPipes(raw);
      await executeRCode(`head(${clean})`);

      // Return focus to the editor after executing
      await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    })
  );
}

function deactivate() { }

module.exports={activate,deactivate};