# EAS build identity (read-only `eas build:list --platform ios --limit 8 --json`, 2026-09-02 ~18:35 PDT)

| iOS build | appVersion | profile | gitCommitHash | status | createdAt (UTC) | distribution | EAS build id |
|---|---|---|---|---|---|---|---|
| 33 | 4.1.1 | testflight | f5594171e75bc5ec92a87d0392c361601ddedfba | FINISHED | 2026-09-01T04:20:10Z | STORE | 2f10f578-a406-4354-86fb-677480234859 |
| 32 | 4.1.1 | testflight | 7c0fc24b7739b9142ac9d428d34216d9707a4413 | FINISHED | 2026-09-01T02:21:03Z | STORE | b92f17d6-55de-4671-a4c8-505c29a552e1 |
| 31 | 4.1.1 | testflight | 7e13d76e70e6604f4ee1035267fecdb4ad387905 | FINISHED | 2026-08-31T23:22:00Z | STORE | d6f779bd-e99c-4b5c-8f90-f32a3a6a9001 |
| 30 | 4.1.1 | testflight | a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50 | FINISHED | 2026-08-24T06:12:58Z | STORE | e1638e01-a7a8-468e-9cff-5d512e608a95 |
| 28 | 3.0.0 | testflight | d0fbede423be85dd4caa6f4c827a186852fe2873 | FINISHED | 2026-08-19T21:14:50Z | STORE | 8e91906a-6cd1-441e-8737-f0c24c1b38f1 |
| 27 | 3.0.0 | testflight | d7cd907daf6090034233e1d666a56f2591790a8c | FINISHED | 2026-08-14T04:03:07Z | STORE | 931f923a-5f5a-4b2b-a0ca-7bdddfe32419 |
| 26 | 3.0.0 | testflight | 5ab3f0c4103035973e08919db4d079adb8780a82 | FINISHED | 2026-07-30T23:30:44Z | STORE | b6bb0429-ca0c-425c-be39-32c556dc0a52 |
| 25 | 3.0.0 | testflight | d43f8672de2ff06650d034f24d5165a7a44bd29e | FINISHED | 2026-07-20T08:14:38Z | STORE | 6ee22e1d-ba3d-4fc0-ac7a-d87f27034f91 |

Conclusions (Lane A):
- EAS confirms Build 33's source SHA == release/current.json `app.sourceCommit` (f5594171). The manifest's `eas.buildId`, `eas.profile`, `eas.createdAt` are recorded as UNPROVEN/null but are provable from EAS: id 2f10f578-a406-4354-86fb-677480234859, profile testflight, created 2026-09-01T04:20:10Z (DOCS_ONLY follow-up).
- Build 30 was cut from a0bf4d04 = the merge-base of today's main and Build 33; Builds 31–33 are all from the codex final-polish lineage, none from main.
- No build has ever been cut from a commit that is on today's `main` after a0bf4d04 (main's five later commits are docs/guards).
- runtimeVersion/channel are null: EAS Update is not in use (no OTA path; every fix needs a store build).
{"id": "2f10f578-a406-4354-86fb-677480234859", "status": "FINISHED", "appVersion": "4.1.1", "appBuildVersion": "33", "buildProfile": "testflight", "gitCommitHash": "f5594171e75bc5ec92a87d0392c361601ddedfba", "gitCommitMessage": "docs(qa): record RCTFatal diagnosis and XXXL acceptance", "createdAt": "2026-09-01T04:20:10.967Z", "completedAt": "2026-09-01T04:26:32.030Z", "distribution": "STORE", "isGitWorkingTreeDirty": null, "sdkVersion": "54.0.0", "runtimeVersion": null, "resourceClass": null, "initiatingActor": {"displayName": "skypie911"}}
False no submissions key
metrics/other keys: ['artifacts', 'expirationDate', 'fingerprint', 'isForIosSimulator', 'logFiles', 'metrics', 'platform', 'priority', 'project', 'updatedAt']
