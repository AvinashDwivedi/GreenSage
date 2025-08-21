import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../.env' });

let suggestionPanel: vscode.WebviewPanel | null = null;

// Store selection metadata globally
let lastSelection: {
  uri: vscode.Uri;
  range: vscode.Range;
} | null = null;

function getLoadingView(): string {
  return `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<style>
			html, body {
			height: 100%;
			margin: 0;
			display: flex;
			justify-content: center;
			align-items: center;
			font-family: sans-serif;
			background-color: #ffffff;
			}

			.loading-container {
			text-align: center;
			}

			.spinner {
			margin: 0 auto 20px;
			width: 50px;
			height: 50px;
			border: 5px solid #ccc;
			border-top-color: #007acc;
			border-radius: 50%;
			animation: spin 1s linear infinite;
			}

			@keyframes spin {
			to { transform: rotate(360deg); }
			}

			h2 {
			color: #333;
			}
		</style>
		</head>
		<body>
		<div class="loading-container">
			<div class="spinner"></div>
			<h2>Analyzing the code...</h2>
		</div>
		</body>
		</html>`;
		}


function updateSuggestionPanel(suggestion: any, selectedText: string, context: vscode.ExtensionContext) {
  if (!suggestionPanel) return;

  suggestionPanel.webview.html = getWebviewContentWithReplace(suggestion);

  suggestionPanel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'replace') {
      if (!lastSelection) {
        vscode.window.showErrorMessage('No original selection stored to replace.');
        return;
      }

      const { uri, range } = lastSelection;
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === uri.toString());

		if (!editor) {
		vscode.window.showErrorMessage('Editor not visible. Please open the file to replace.');
		return;
		}


      editor.edit(editBuilder => {
        editBuilder.replace(range, suggestion.suggested_code);
      });
    }
  });
}


export function activate(context: vscode.ExtensionContext) {
	const analyzeDisposable = vscode.commands.registerCommand(
	'greencode.analyzeSelectedCode',
	async () => {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);

	if (!selectedText.trim()) {
		vscode.window.showWarningMessage('No code selected.');
		return;
	}

	lastSelection = {
		uri: editor.document.uri,
		range: new vscode.Range(selection.start, selection.end)
	};

	// Step 1: Show panel immediately
	suggestionPanel = vscode.window.createWebviewPanel(
		'greensageSuggestions',
		'Green Suggestions',
		vscode.ViewColumn.Beside,
		{
		enableScripts: true,
		retainContextWhenHidden: true
		}
	);
	suggestionPanel.webview.html = getLoadingView(); // show analyzing...

	// Step 2: Get suggestion from OpenAI
	const suggestion = await analyzeWithOpenAI(selectedText);

	// Step 3: Update the panel with suggestions
	updateSuggestionPanel(suggestion, selectedText, context);
	}
	);


  context.subscriptions.push(analyzeDisposable);
}

function showSuggestionPanelWithReplace(
  context: vscode.ExtensionContext,
  suggestion: any,
  selectedText: string
) {
  const panel = vscode.window.createWebviewPanel(
    'greensageSuggestions',
    'Green Suggestions',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = getWebviewContentWithReplace(suggestion);

  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'replace') {
      if (!lastSelection) {
        vscode.window.showErrorMessage(
          'No original selection stored to replace.'
        );
        return;
      }

      const { uri, range } = lastSelection;

      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
      });

      editor.edit(editBuilder => {
        editBuilder.replace(range, suggestion.suggested_code);
      });
    }
  });
}

function getWebviewContentWithReplace(data: any): string {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: sans-serif; padding: 1rem; }
        pre { background: #f5f5f5; padding: 1rem; overflow-x: auto; }
        button {
          background-color: #007acc; color: white;
          border: none; padding: 0.5rem 1rem;
          margin-top: 1rem; cursor: pointer; border-radius: 4px;
        }
        h2 { margin-top: 2rem; }
      </style>
    </head>
    <body>
      <h2>🌱 Reason</h2>
      <p>${data.reason}</p>

      <h2>🧾 Original Code</h2>
      <pre>${escapeHtml(data.original_code)}</pre>

      <h2>✅ Suggested Code</h2>
      <pre>${escapeHtml(data.suggested_code)}</pre>

      <button onclick="replaceInEditor()">Replace in Editor</button>

      <script>
        const vscode = acquireVsCodeApi();
        function replaceInEditor() {
          vscode.postMessage({ command: 'replace' });
        }
      </script>
    </body>
    </html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function analyzeWithOpenAI(code: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      original_code: code,
      suggested_code: code,
      reason: '❌ OpenAI API key not found. Make sure to define it in a .env file.'
    };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            "You're a sustainable coding assistant. Reply only in JSON format containing keys: original_code, suggested_code, and reason. No explanation outside the JSON object."
        },
        {
          role: 'user',
          content: `Analyze the following code for sustainability and suggest improvements. Return a JSON object:\n\n${code}`
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    return {
      original_code: code,
      suggested_code: code,
      reason: `❌ OpenAI Error: ${response.statusText}`
    };
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    parsed = {
      original_code: code,
      suggested_code: code,
      reason:
        '⚠️ Could not parse AI response as JSON. Check prompt or model output.'
    };
  }

  return parsed;
}

export function deactivate() {}
