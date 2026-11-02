import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params?.q ? `?q=${encodeURIComponent(params.q)}` : "";
  redirect(`/explore${q}`);
}
