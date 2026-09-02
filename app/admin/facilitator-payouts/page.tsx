import AdminNav from "@/components/admin/AdminNav";
import FacilitatorPayoutsAdmin from "@/components/admin/FacilitatorPayoutsAdmin";

export default function AdminFacilitatorPayoutsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Repasses de facilitadores</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revise comissões disponíveis, aprove repasses e registre pagamentos manuais.
        </p>
      </div>
      <FacilitatorPayoutsAdmin />
    </div>
  );
}
