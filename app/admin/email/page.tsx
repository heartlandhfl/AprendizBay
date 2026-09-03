import EmailDeliveryMonitor from "@/components/admin/EmailDeliveryMonitor";
import JetSendDomainsPanel from "@/components/admin/JetSendDomainsPanel";

export default function AdminEmailPage() {
  return (
    <div className="space-y-10">
      <JetSendDomainsPanel />
      <EmailDeliveryMonitor />
    </div>
  );
}
