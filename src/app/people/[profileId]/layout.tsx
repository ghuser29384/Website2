import { ProfileCredibilityLink } from "@/components/profile-credibility-link";

export default async function PublicProfileLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ profileId: string }>;
}>) {
  const { profileId } = await params;

  return (
    <>
      <ProfileCredibilityLink profileId={profileId} />
      {children}
    </>
  );
}
