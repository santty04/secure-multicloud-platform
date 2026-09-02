import { DetailDrawer } from "@/components/shared/detail-drawer";
import { providerFullName } from "@/components/shared/provider-badge";
import { instanceStatusPresentation } from "@/lib/utils/status";
import type { LiveAwsInstance } from "@/types/domain";

export function AwsInventoryDrawer({
  instance,
  open,
  onOpenChange,
}: {
  instance: LiveAwsInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!instance) {
    return <DetailDrawer open={false} onOpenChange={onOpenChange} kindLabel="" title="" fields={[]} />;
  }

  const { label } = instanceStatusPresentation(instance.state);

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      kindLabel="Inventario AWS"
      title={instance.name || instance.instanceId}
      banner={{
        tone: "warning",
        title: "No administrada:",
        text: "este registro viene de AWS live y no expone UUID interno para acciones o consulta de estado administrado.",
      }}
      fields={[
        { label: "Estado", value: label },
        { label: "Proveedor", value: providerFullName(instance.provider) },
        { label: "Instance ID", value: instance.instanceId, mono: true },
        { label: "Tipo", value: instance.instanceType, mono: true },
        { label: "IP privada", value: instance.privateIp ?? "No disponible", mono: true },
        { label: "Región", value: instance.region, mono: true },
      ]}
    />
  );
}
