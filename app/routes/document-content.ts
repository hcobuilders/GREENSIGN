import { getProjectDocumentContent } from "../lib/documents.server";
import type { Route } from "./+types/document-content";

export async function loader({ params }: Route.LoaderArgs) {
  const document = await getProjectDocumentContent(params.documentId);
  if (!document) throw new Response("Document not found", { status: 404 });
  return new Response(Buffer.from(document.content, "base64"), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
