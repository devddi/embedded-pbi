import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Building2, ArrowLeft } from "lucide-react";
import { powerbiClientsService, PowerBIClient } from "@/services/powerbiClientsService";

export default function Clients() {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<PowerBIClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<PowerBIClient | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<PowerBIClient | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    tenant_id: "",
    client_secret: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await powerbiClientsService.list();
      setClients(data);
    } catch (error) {
      console.error("Erro ao carregar clientes Power BI:", error);
      toast.error("Erro ao carregar clientes Power BI");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      tenant_id: "",
      client_secret: "",
      email: "",
      password: "",
    });
    setEditingClient(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (client: PowerBIClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      client_id: client.client_id,
      tenant_id: client.tenant_id,
      client_secret: client.client_secret,
      email: client.email,
      password: client.password,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.client_id || !formData.tenant_id || !formData.client_secret || !formData.email || !formData.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      if (editingClient?.id) {
        await powerbiClientsService.update(editingClient.id, formData);
        toast.success("Cliente atualizado com sucesso");
      } else {
        await powerbiClientsService.create(formData);
        toast.success("Cliente criado com sucesso");
      }
      setIsDialogOpen(false);
      resetForm();
      loadClients();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete?.id) return;

    try {
      await powerbiClientsService.remove(clientToDelete.id);
      toast.success("Cliente removido com sucesso");
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);
      loadClients();
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast.error("Erro ao remover cliente");
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              Gestão de Clientes
            </h1>
            <p className="text-muted-foreground">
              Cadastre clientes e suas credenciais para buscar dashboards do Power BI.
            </p>
          </div>
          {userRole === "admin_master" && (
            <Button onClick={handleOpenCreate} className="flex items-center gap-2 w-fit">
              <Plus className="w-4 h-4" />
              Novo Cliente
            </Button>
          )}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Clientes configurados</CardTitle>
            <CardDescription>
              Cada cliente possui seu próprio par de credenciais para autenticação no Power BI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                Nenhum cliente cadastrado ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Client ID</TableHead>
                      <TableHead>Tenant ID</TableHead>
                      <TableHead>Email</TableHead>
                      {userRole === "admin_master" && <TableHead className="w-[120px]">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[180px]">
                          {client.client_id}
                        </TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[140px]">
                          {client.tenant_id}
                        </TableCell>
                        <TableCell>{client.email}</TableCell>
                        {userRole === "admin_master" && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenEdit(client)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  setClientToDelete(client);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
              <DialogDescription>
                Informe as credenciais dessa conta de Power BI. Elas serão usadas para buscar os dashboards do cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome do Cliente</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Client ID</Label>
                <Input
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Tenant ID</Label>
                <Input
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={formData.client_secret}
                  onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email da conta Power BI</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Senha da conta Power BI</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingClient ? "Salvar alterações" : "Criar Cliente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="glass-card max-w-sm">
            <DialogHeader>
              <DialogTitle>Remover Cliente</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover o cliente{" "}
                <span className="font-semibold">{clientToDelete?.name}</span>? Essa ação não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

