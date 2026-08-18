# Local Chat

`<local-chat>` is a floating, resizable chat widget powered entirely by
Chrome's built-in on-device AI, grounded in context you provide.

## Status

Implemented per `SPEC.md`: Parent/Child on-device sessions, streamed
markdown responses, Follow-ups/Starters/Icebreakers, persisted History,
drag/resize, host-invokable Triggers (`trigger-selector` or the
`expand()`/`collapse()`/`toggle()` methods), multi-line input, and Shadow
DOM theming via `--local-chat-*` custom properties. Requires a Chrome
build with the on-device Prompt API (`window.LanguageModel`) available;
the component is a no-op everywhere else.

## Development

```sh
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

`index.html` (served by `npm run dev`) doubles as the project's
introduction/documentation page and a live demo — its own chat widget is
grounded in the page's documentation content and answers questions about
it. It is not part of the published package (`dist` only).

## License

Local Chat is licensed under the [GNU Affero General Public License v3.0](LICENSE).
