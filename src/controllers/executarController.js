// src/controllers/executarController.js — execução local via child_process
const { exec }    = require('child_process');
const fs          = require('fs/promises');
const path        = require('path');
const os          = require('os');
const crypto      = require('crypto');
const { promisify } = require('util');

const execAsync = promisify(exec);
const TIMEOUT   = 15000; // 15 segundos por execução

// ── Utilitários ──────────────────────────────────────────────

async function run(cmd, opts = {}) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: TIMEOUT, ...opts });
    return { stdout: stdout || '', stderr: stderr || '' };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || err.message };
  }
}

function resultado(stdout, stderr) {
  const out = (stdout || '').trim();
  const err = (stderr || '').trim();
  if (out) return { sucesso: true,  output: out, erro: err };
  if (err) return { sucesso: false, output: '',  erro: err };
  return { sucesso: true, output: '✅ Código executado com sucesso (sem output).', erro: '' };
}

function tmpId() {
  return crypto.randomBytes(6).toString('hex');
}

// ── Executores por linguagem ─────────────────────────────────

async function runJavaScript(codigo) {
  const file = path.join(os.tmpdir(), `synthia_${tmpId()}.js`);
  try {
    await fs.writeFile(file, codigo, 'utf8');
    const { stdout, stderr } = await run(`node "${file}"`);
    return resultado(stdout, stderr);
  } finally {
    await fs.unlink(file).catch(() => {});
  }
}

async function runPython(codigo) {
  const file = path.join(os.tmpdir(), `synthia_${tmpId()}.py`);
  try {
    await fs.writeFile(file, codigo, 'utf8');
    // Tenta python3 primeiro; se falhar, tenta python
    let r = await run(`python3 "${file}"`);
    if (r.stderr.includes('not recognized') || r.stderr.includes('No such file')) {
      r = await run(`python "${file}"`);
    }
    return resultado(r.stdout, r.stderr);
  } finally {
    await fs.unlink(file).catch(() => {});
  }
}

async function runJava(codigo) {
  const match     = codigo.match(/public\s+class\s+(\w+)/);
  const className = match ? match[1] : 'Main';
  const dir       = path.join(os.tmpdir(), `synthia_java_${tmpId()}`);
  const file      = path.join(dir, `${className}.java`);

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, codigo, 'utf8');

    // Compilação
    const compile = await run(`javac "${file}"`, { cwd: dir });
    if (compile.stderr.trim()) {
      return { sucesso: false, output: '', erro: `☕ Erro de compilação:\n\n${compile.stderr}` };
    }

    // Execução
    const { stdout, stderr } = await run(`java -cp "${dir}" ${className}`);
    return resultado(stdout, stderr);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runCSharp(codigo) {
  // Verifica se dotnet está instalado
  const check = await run('dotnet --version');
  if (check.stderr.includes('not recognized') || check.stderr.includes('No such file')) {
    return { sucesso: false, output: '', erro: '❌ .NET SDK não encontrado.\nInstala em: https://dotnet.microsoft.com/download' };
  }

  const dir = path.join(os.tmpdir(), `synthia_cs_${tmpId()}`);
  try {
    await fs.mkdir(dir, { recursive: true });

    const csproj = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>`;

    await fs.writeFile(path.join(dir, 'Program.csproj'), csproj, 'utf8');
    await fs.writeFile(path.join(dir, 'Program.cs'),     codigo, 'utf8');

    const { stdout, stderr } = await run('dotnet run --no-launch-profile', { cwd: dir });
    return resultado(stdout, stderr);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Controller principal ─────────────────────────────────────

const EXECUTORES = {
  javascript: runJavaScript,
  python:     runPython,
  java:       runJava,
  csharp:     runCSharp,
};

const executarCodigo = async (req, res) => {
  const { codigo, linguagem } = req.body;

  if (!codigo?.trim() || !linguagem) {
    return res.status(400).json({ sucesso: false, mensagem: 'Código e linguagem são obrigatórios.' });
  }

  const executor = EXECUTORES[linguagem];
  if (!executor) {
    return res.status(400).json({ sucesso: false, mensagem: `Linguagem '${linguagem}' não suportada.` });
  }

  try {
    const r = await executor(codigo);
    res.json({ sucesso: true, dados: { run: { stdout: r.output, stderr: r.erro, output: r.output } } });
  } catch (err) {
    console.error('❌ Erro ao executar código:', err.message);
    res.status(500).json({ sucesso: false, mensagem: err.message });
  }
};

module.exports = { executarCodigo };
