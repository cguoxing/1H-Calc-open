# YiCalc (易计算) · Engineering Fee Calculator for WeChat

**English** | [简体中文](README.zh-CN.md)

> Chinese engineering fee standards in your pocket: describe a project in one sentence and get a quote you can trace back to the rules.

YiCalc is a WeChat Mini Program for architects, engineers, cost consultants and tendering agents in China. Enter the fee base, pick the discipline and complexity, and it calculates the service fee according to national and local fee standards, then exports a PDF quotation showing every formula, coefficient and the document number of the standard used.

This project is an entry in the 2026 WeChat Mini Program Development Contest (theme: "Coexisting with AI"). It is developed and open-sourced by [1+H ARCH](https://www.1h-arch.com). The app's interface is in Chinese.

## Features

| Module | What it covers |
| --- | --- |
| Six project stages | F1 investment decision, F2 territorial spatial planning, F3 geotechnical survey, F4 engineering design, F5 cost consulting, F6 whole-process consulting |
| Specialty design | Interior, landscape, private residence, signage, soft furnishing, lighting, acoustics |
| Standalone tools | Tendering agency (national + Guangdong / Shanghai / Zhejiang rules), construction supervision, project management agency, pre-construction consulting, land consolidation, infrastructure networks, rural revitalization, urban renewal, energy projects |
| Smart input | Type "municipal road design, 30 million" on the home page; stage, discipline and amount are recognized and the right calculator opens (keyword rules) |
| Traceable results | The result page shows the base price, every coefficient, the linear-interpolation formula and each calculation step |
| PDF quotation | One tap generates a quotation ready to send to the client |
| Projects | Group several stages under one project, see totals, compare options |
| References | Fee standards, policy library, user manual, FAQ, unit converter |
| Two editions | Full engineering edition; specialty edition for interior / landscape / signage / acoustic design firms |

## Fee standards

`standards/` contains structured Markdown transcriptions of 24 fee documents, so every number in a calculator can be traced back to its source. Key documents include:

- *Engineering Survey and Design Fee Standard*, Jijiage [2002] No. 10
- Tendering agency fee rules, Jijiage [2002] No. 1980 and Fagaiban Jiage [2011] No. 534
- Construction supervision fee rules, Fagai Jiage [2007] No. 670
- Capital construction cost rules, Caijian [2016] No. 504
- Local standards of Guangdong, Beijing and Shanghai, and the 2024 Guangdong service cost guideline

Engineering service fees in China have been market-priced since 2015 (Fagai Jiage [2015] No. 299). Results are a reference baseline for quoting and negotiation, **not a contract amount**.

## Getting started

Requirements: [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/download.html) and Node.js 18+ (only for running the tests; there are no npm dependencies).

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-name>/<repo>.git
   ```

2. Import the project root in WeChat DevTools.
3. Replace `appid` in `project.config.json` with your own Mini Program AppID (or use a test account).
4. Compile and preview. All calculations run on the device; no backend is required.

## Project structure

```
miniprogram/
├── pages/             28 pages (home, calculator, result, history, toolbox, settings, specialty calculators)
├── utils/             calculation core (calculator.js, interpolation.js, …), PDF generation, backup
├── data/              base price tables, coefficient tables, specialty rate data
└── custom-tab-bar/    custom tab bar
cloudfunctions/        WeChat Cloud functions (disabled by default)
west-host-backup/      optional PHP backup API and monitoring page
standards/             transcribed fee standards
test-*.js              automated checks
```

## Tests

```bash
npm run check
```

Runs 9 checks in one go: JS syntax, JSON validity, WXSS, page/asset consistency (including WXML event bindings), calculation results, page logic, data integrity and backup logic, and PDF format.

## Data and privacy

- History and projects are stored only on the user's phone by default.
- Automatic backup runs only for users who have registered and accepted the privacy policy, and only uploads when data has changed.
- Users can delete their cloud backup at any time under Settings → Account & Data Backup.

### Optional: self-hosted backup

`west-host-backup/` is a database-free PHP backup API that runs on ordinary shared hosting:

1. Upload `api.php` and `monitor.php`, copy `config.sample.php` to `config.php`, and fill in your AppID, AppSecret, a random salt and the monitor password hash.
2. Add your API domain to the request domain allowlist in the WeChat admin console.
3. Point `apiUrl` in `miniprogram/utils/server-backup-config.js` to your server, or set `enabled` to `false` if you don't need backup.

The API authenticates users by exchanging the one-time `wx.login` code for an openid on the server, so the Mini Program contains no secrets. See [west-host-backup/README.md](west-host-backup/README.md) (Chinese).

**Note:** `config.php` contains your AppSecret. It is excluded by `.gitignore`; never commit it.

## Built with AI

YiCalc was built by an architecture practitioner working with several AI tools. People transcribed the standards, confirmed every rate and coefficient, and made the key decisions; AI (Claude Code / Cowork, ChatGPT / Codex and Chinese LLMs) wrote code, tests, reviews and documentation. A full AI code review before launch found and fixed issues such as an exposed key and privacy-compliance gaps, and each fix came with a matching automated check.

## Contributing

Issues and pull requests are welcome, especially:

- Adding or correcting local fee standards (please cite the document title and number)
- Fixing calculation differences (please include an example and the expected result)

Please make sure `npm run check` passes before submitting.

## License

[MIT](LICENSE) © 2026 1+H ARCH (Shanghai Yihong Architectural Engineering Design Co., Ltd.)

Government fee documents in `standards/` remain the property of their issuing authorities and are provided for reference only.
