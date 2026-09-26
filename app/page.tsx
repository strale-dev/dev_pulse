import { GithubLogo } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <p className="font-heading text-sm font-medium tracking-wide text-primary">
          DevPulse
        </p>
        <h1 className="font-heading mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          What does your GitHub activity say about how you build software?
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          DevPulse turns your public GitHub profile into a personal analytics
          dashboard — repositories, contributions, languages, and actionable
          developer insights.
        </p>
        <ul className="mt-8 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:gap-6">
          <li>Contribution heatmap &amp; streaks</li>
          <li>Repository &amp; language breakdown</li>
          <li>AI Developer Insights</li>
        </ul>
        <Button
          className="mt-10 h-9 gap-2 px-4 text-sm"
          size="lg"
          disabled
          aria-disabled
        >
          <GithubLogo weight="fill" className="size-4" aria-hidden />
          Sign in with GitHub
        </Button>
      </main>
    </div>
  );
}
