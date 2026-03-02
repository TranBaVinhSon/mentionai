import EditAgentForm from "./edit-client-page";

type Props = {
  params: Promise<{ uniqueId: string }>;
};

export default async function EditPage({ params }: Props) {
  const { uniqueId } = await params;
  return <EditAgentForm uniqueId={uniqueId} />;
}
