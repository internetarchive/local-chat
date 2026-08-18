# Local Chat

`<local-chat>` is a floating, resizable chat widget powered entirely by
Chrome's built-in on-device AI, grounded in context you provide.

## Status

Implemented per `SPEC.md`: Parent/Child on-device sessions, streamed
markdown responses, Follow-ups/Starters/Icebreakers, drag/resize, and
Shadow DOM theming via `--local-chat-*` custom properties. Requires a
Chrome build with the on-device Prompt API (`window.LanguageModel`)
available; the component is a no-op everywhere else.

## Development

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

`demo/index.html` (served by `npm run dev`) is a manual test page for
verifying against a real Chrome build — it is not part of the published
package.

## License

Local Chat is licensed under the [GNU Affero General Public License v3.0](LICENSE).
