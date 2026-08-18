# Local Chat

**[Try it live →](https://internetarchive.github.io/local-chat/)** (docs and
a live demo, served straight from this repo's `main` branch)

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

## Installation

```sh
npm install @internetarchive/local-chat
```

```js
import '@internetarchive/local-chat'
```

Importing the module is enough: it registers `<local-chat>` as a custom
element as a side effect. There's nothing to call to initialize it.

## Development

```sh
npm install
npm run dev        # serves index.html against the current source
npm test
npm run typecheck
npm run lint
npm run build      # emits the npm package to ./dist
npm run build:site # assembles a deployable copy of index.html in ./site
```

`index.html` (served by `npm run dev`) doubles as the project's
introduction/documentation page and a live demo — its own chat widget is
grounded in the page's documentation content and answers questions about
it. It is not part of the published package (`dist` only).

## Docker

The `Dockerfile` is multi-stage: `dev` and `build` are for local development
and CI; `runtime`, the default target (what plain `docker build .` produces),
is the only one meant for an actual deployment.

**Dev** runs the Vite dev server in watch mode. Bind-mount the repo over
`/app` so edits on your machine take effect immediately; the extra anonymous
volume on `/app/node_modules` keeps the image's own install from being
shadowed by whatever (or whatever's missing) in your local `node_modules`:

```sh
docker build --target dev -t local-chat:dev .
docker run --rm -p 5173:5173 -v "$PWD":/app -v /app/node_modules local-chat:dev
# -> http://localhost:5173/
```

**Prod** runs `typecheck`/`lint`/`test`/`build:site` in an intermediate
stage, then serves the result with nginx as an unprivileged user (no Node in
the final image at all, since local-chat is entirely client-side):

```sh
docker build -t local-chat .
docker run --rm -p 8080:8080 local-chat
# -> http://localhost:8080/
```

## License

Local Chat is licensed under the [GNU Affero General Public License v3.0](LICENSE).
