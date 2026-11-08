# Third Party Notices

Original Bookleap application code is offered under AGPL-3.0-only. This does not relicense third-party components. Corresponding source: https://github.com/Richology/Bookleap .

## Motion 11.11.17

The vendored `lib/feynmanExport/guizang/assets/motion.min.js` identifies `motion@11.11.17` as its source and was bundled by jsDelivr. Motion is MIT-licensed; its upstream package license is preserved at `lib/feynmanExport/guizang/LICENSE-MOTION-MIT.txt`.

## Other dependencies and non-code assets

Electron and npm dependencies retain their respective licenses; consult their installed LICENSE files and the lockfiles. Third-party book covers, icons, trademarks and quoted passages are not relicensed under the application's AGPL license. User-uploaded books and private reading data are not distributed as source.

## Guizang PPT Skill

BookLeap's "讲书演示 Beta" feature uses and adapts assets from Guizang PPT Skill.

- Upstream project: https://github.com/op7418/guizang-ppt-skill
- Author: 歸藏
- License: GNU Affero General Public License v3.0
- Upstream commit used for this integration: `014c572454065e905477a7432ae331dfc0fe6070`
- Local license copy: `lib/feynmanExport/guizang/LICENSE-AGPL-3.0.txt`
- Local integration source: `lib/feynmanExport/guizang/`

BookLeap changes include adapting the skill's HTML templates for generated book presentation decks, adding BookLeap-specific content generation and rendering logic, and adding legal/source notices in the generation UI and generated HTML.
