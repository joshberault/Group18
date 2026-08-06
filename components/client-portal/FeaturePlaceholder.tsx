import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PortalFeatureShell } from "@/components/client-portal/PortalFeatureShell";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
}

export function FeaturePlaceholder({
  title,
  description,
}: FeaturePlaceholderProps) {
  return (
    <PortalFeatureShell title={title} description={description}>
      <Card>
        <CardHeader>
          <CardTitle>Subfeatures coming next</CardTitle>
          <CardDescription>
            This app is ready for the details you want to add. Describe the
            subfeatures when you are ready and we will build them here.
          </CardDescription>
        </CardHeader>
      </Card>
    </PortalFeatureShell>
  );
}
