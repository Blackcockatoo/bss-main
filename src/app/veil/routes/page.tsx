import { getVeilRoleSwitchHref } from "@/lib/veil/role-state";
import Link from "next/link";

const teacherRoutes = [
  "/veil",
  "/veil/pair",
  "/veil/forge",
  "/veil/dna-hub",
  "/veil/digital-dna",
  "/veil/school-quest",
  "/veil/constellation",
  "/veil/pet",
];
const kidRoutes = [
  "/veil/kid",
  "/veil/kid/pair",
  "/veil/kid/redeem",
  "/veil/kid/bonds",
];
const switchToKidHref = getVeilRoleSwitchHref("kid");
const switchToTeacherHref = getVeilRoleSwitchHref("teacher");

export default function RoutesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <h1 className="text-xl font-semibold text-slate-100">Route map</h1>
      <p className="mt-2 text-sm text-slate-400">
        Use this page to deep-link both teacher and kid flows during E2E/manual
        testing.
      </p>

      <section className="mt-4 rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-cyan-300">Teacher segment</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {teacherRoutes.map((route) => (
            <li key={route}>
              <Link
                href={route}
                className="underline decoration-slate-600 hover:text-white"
              >
                {route}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-purple-500/30 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-purple-300">Kid segment</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {kidRoutes.map((route) => (
            <li key={route}>
              <Link
                href={route}
                className="underline decoration-slate-600 hover:text-white"
              >
                {route}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Need role switch? Use{" "}
          <Link href={switchToKidHref} className="underline">
            {switchToKidHref}
          </Link>{" "}
          or{" "}
          <Link href={switchToTeacherHref} className="underline">
            {switchToTeacherHref}
          </Link>
          .
        </p>
      </section>

      <p className="mt-4 text-xs text-slate-500">
        Extended test notes live in <code>docs/deep-links.md</code>.
      </p>
    </main>
  );
}
