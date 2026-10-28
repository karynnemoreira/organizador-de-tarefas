<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the study-organizer screen in JavaScript/JSX; retain the existing TanStack bootstrap and infrastructure to avoid unrelated conversion changes.
- Task-title edits use a separate draft and update only the saved text after nonempty trimmed validation, so canceling preserves the task and its metadata.
