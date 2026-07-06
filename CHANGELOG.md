# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.21](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.20...v0.1.21) (2026-07-06)


### Features

* **progress:** render a failed tool status instead of stuck "Running" ([e2f5898](https://github.com/fengsh27/isotar-v2-frontend/commit/e2f5898ae6c046a6ff8016fd3f86230bd41eedba))

### [0.1.20](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.19...v0.1.20) (2026-07-04)

### [0.1.19](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.18...v0.1.19) (2026-06-30)

### [0.1.18](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.17...v0.1.18) (2026-06-29)


### Features

* **network:** support per-miRNA precursor (pre_id) selection ([cb79dcb](https://github.com/fengsh27/isotar-v2-frontend/commit/cb79dcb39e029f31fddf18acba8171891dcdcb8a))

### [0.1.17](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.16...v0.1.17) (2026-06-25)


### Features

* **network:** mir-network run flow + Cytoscape visualization ([452b2d7](https://github.com/fengsh27/isotar-v2-frontend/commit/452b2d780765c77332602f82a6b69440e67e7d1e))
* **network:** rebuild mir-network run flow as a 6-step wizard ([24a2e49](https://github.com/fengsh27/isotar-v2-frontend/commit/24a2e4995b4b17b21806a330b8758f4c5b82024c))
* **wizard:** enforce mature-seq length 17-30 and require name for custom miRNA ([48f9bdc](https://github.com/fengsh27/isotar-v2-frontend/commit/48f9bdcadd8a9e4d07a047ef054e68102e46f49c))

### [0.1.16](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.15...v0.1.16) (2026-06-22)


### Features

* **lncrna:** allow PITA in the miR-LncRNA tool step ([85486ae](https://github.com/fengsh27/isotar-v2-frontend/commit/85486ae41179459f7abf52336d1ca8e98182d558))

### [0.1.15](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.14...v0.1.15) (2026-06-16)

### [0.1.14](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.13...v0.1.14) (2026-06-16)

### [0.1.13](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.12...v0.1.13) (2026-06-16)

### [0.1.12](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.11...v0.1.12) (2026-06-16)


### Features

* **lncrna:** gate TargetScan/PITA and enrichment for the miR-LncRNA workflow ([b9adcc2](https://github.com/fengsh27/isotar-v2-frontend/commit/b9adcc2a48942e36e62688d451ad4be07db44e0f))

### [0.1.11](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.9...v0.1.11) (2026-06-09)

### [0.1.10](https://github.com/fengsh27/isotar-v2-frontend/compare/v0.1.9...v0.1.10) (2026-06-09)

### 0.1.9 (2026-05-25)

Realigns the tracked version with the published Docker image tag (image tags
0.1.2–0.1.9 were bumped by hand without a release). Recent changes folded in:

* show the predicted miRNA on the job result view (card subtitle + metadata panel)
* 4+-tool overlap visualization: consensus histogram + UpSet plot
* per-tool job progress (live + after refresh)
* display the app version in the footer (`NEXT_PUBLIC_APP_VERSION`)

### 0.1.1 (2026-03-03)
