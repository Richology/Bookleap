# Bookleap open-source publication

The application is licensed under AGPL-3.0-only. Existing features and upstream notices are retained. Motion's separate MIT notice is included alongside its vendored bundle.

Before publication, all reachable branches and tags are checked for credentials and uploaded books. The `uploads/` directory is removed from Git history, not merely from the latest revision. Recovery bundles remain private and must never be committed or uploaded to a public release.

Rewriting history changes commit IDs. Existing contributors should re-clone the cleaned repository instead of merging or pushing old branches back. GitHub pull-request references and cached views require separate verification; rewriting branch heads alone does not prove that all historical copies are gone.

Original code is covered by the root LICENSE. Third-party software retains its own notices. Covers, trademarks, quoted book content and users' private libraries are not relicensed by publishing this repository.
