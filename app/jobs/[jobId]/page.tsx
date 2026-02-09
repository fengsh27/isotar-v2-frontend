import { JobStatus } from "@/components/job/JobStatus";

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return <JobStatus jobId={jobId} />;
}
