// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
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

		vscode.window.showInformationMessage('Analyzing selected code...');

		const suggestions = await analyzeWithOpenAI(selectedText);

		const suggestionObj = await analyzeWithOpenAI(selectedText);
		showSuggestionPanelWithReplace(context, suggestionObj, selectedText);

	  
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContentWithReplace(data: any): string {
  return `<!DOCTYPE html>
			<html lang="en">
			<head>
			<meta charset="UTF-8">
			<style>
				body {
				font-family: sans-serif;
				padding: 1rem;
				}
				pre {
				background: #f5f5f5;
				padding: 1rem;
				overflow-x: auto;
				}
				button {
				background-color: #007acc;
				color: white;
				border: none;
				padding: 0.5rem 1rem;
				margin-top: 1rem;
				cursor: pointer;
				border-radius: 4px;
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
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;");
}



function showSuggestionPanelWithReplace(context: vscode.ExtensionContext, suggestion: any, selectedText: string) {
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
		const editor = vscode.window.activeTextEditor;
		if (!editor) return;

		editor.edit(editBuilder => {
		const selection = editor.selection;
		editBuilder.replace(selection, suggestion.suggested_code);
		});
	}
	});
}


async function analyzeWithOpenAI(code: string): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
	return '❌ OpenAI API key not found. Make sure to define it in a .env file.';
	}

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
	method: "POST",
	headers: {
		"Authorization": `Bearer ${apiKey}`,
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		model: "gpt-4",
		messages: [
		{
			role: "system",
			content: "You're a sustainable coding assistant. Reply only in JSON format containing keys: original_code, suggested_code, and reason. No explanation outside the JSON object."
		},
		{
			role: "user",
			content: `Analyze the following code for sustainability and suggest improvements. Return a JSON object:\n\n${code}`
		}
		],
		temperature: 0.3
	})
	});


	if (!response.ok) {
	return `❌ OpenAI Error: ${response.statusText}`;
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
		reason: "⚠️ Could not parse AI response as JSON. Check prompt or model output."
	};
	}

	return parsed;
}


// This method is called when your extension is deactivated
export function deactivate() {}
