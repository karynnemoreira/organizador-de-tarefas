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

- Use JavaScript for all editable source and configuration files, with JSX for React components; keep TanStack Start and configure its route generator for JavaScript output to preserve routing.
- Task-title edits use a separate draft and update only the saved text after nonempty trimmed validation, so canceling preserves the task and its metadata.
