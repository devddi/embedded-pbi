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
import { Plus, Edit2, Trash2, Building2, Users as UsersIcon } from "lucide-react";
import { organizationService, Organization, OrganizationMember } from "@/services/organizationService";

export default function Organizations() {
  const { userRole, user } = useAuth();
  const navigate = useNavigate();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create/Edit Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");

  // Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  // Members Dialog
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [selectedOrgForMembers, setSelectedOrgForMembers] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationService.list();
      setOrganizations(data);
    } catch (error) {
      console.error("Erro ao carregar organizações:", error);
      toast.error("Erro ao carregar organizações");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setOrgName("");
    setLogoUrl("");
    setPrimaryColor("#000000");
    setEditingOrg(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (org: Organization) => {
    setOrgName(org.name);
    setLogoUrl(org.logo_url || "");
    setPrimaryColor(org.primary_color || "#000000");
    setEditingOrg(org);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!orgName.trim()) {
      toast.error("O nome da organização é obrigatório");
      return;
    }

    try {
      if (editingOrg) {
        await organizationService.update(editingOrg.id, orgName, logoUrl, primaryColor);
        toast.success("Organização atualizada com sucesso");
      } else {
        if (!user) return;
        // Se for admin master criando, ele ainda será o owner se o código pegar auth.uid()
        // Mas a policy diz owner_id = auth.uid(). 
        // Se o admin master quiser criar para OUTRO usuário, precisaria de uma lógica diferente.
        // Por enquanto, assumimos que quem cria é o dono.
        await organizationService.create(orgName, user.id, logoUrl, primaryColor);
        toast.success("Organização criada com sucesso");
      }
      setIsDialogOpen(false);
      loadOrganizations();
    } catch (error) {
      console.error("Erro ao salvar organização:", error);
      toast.error("Erro ao salvar organização");
    }
  };

  const handleConfirmDelete = async () => {
    if (!orgToDelete) return;
    try {
      await organizationService.remove(orgToDelete.id);
      toast.success("Organização removida com sucesso");
      setIsDeleteDialogOpen(false);
      setOrgToDelete(null);
      loadOrganizations();
    } catch (error) {
      console.error("Erro ao remover organização:", error);
      toast.error("Erro ao remover organização");
    }
  };

  // Members Logic
  const handleOpenMembers = async (org: Organization) => {
    setSelectedOrgForMembers(org);
    setIsMembersDialogOpen(true);
    setLoadingMembers(true);
    try {
      const orgMembers = await organizationService.listMembers(org.id);
      setMembers(orgMembers);
    } catch (error) {
      console.error("Erro ao carregar membros:", error);
      toast.error("Erro ao carregar membros");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedOrgForMembers) return;
    try {
      await organizationService.removeMember(selectedOrgForMembers.id, userId);
      toast.success("Membro removido com sucesso");
      // Reload members
      handleOpenMembers(selectedOrgForMembers);
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast.error("Erro ao remover membro");
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
              Minhas Organizações
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas empresas e os usuários vinculados a elas.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" />
            Nova Organização
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Organizações Cadastradas</CardTitle>
            <CardDescription>
              Você é dono ou administrador destas organizações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : organizations.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                Nenhuma organização encontrada. Crie uma para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-[180px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              title="Gerenciar Membros"
                              onClick={() => handleOpenMembers(org)}
                            >
                              <UsersIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Editar"
                              onClick={() => handleOpenEdit(org)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Excluir"
                              onClick={() => {
                                setOrgToDelete(org);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="glass-card max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? "Editar Organização" : "Nova Organização"}
              </DialogTitle>
              <DialogDescription>
                Dê um nome para sua organização.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome da Organização</Label>
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: Minha Empresa Ltda"
                />
              </div>
              <div className="grid gap-2">
                <Label>URL da Logo</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
              <div className="grid gap-2">
                <Label>Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingOrg ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="glass-card max-w-sm">
            <DialogHeader>
              <DialogTitle>Remover Organização</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover a organização{" "}
                <span className="font-semibold">{orgToDelete?.name}</span>? 
                Isso removerá também todos os vínculos de usuários e credenciais associadas.
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

        {/* Members Management Dialog */}
        <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
          <DialogContent className="glass-card max-w-3xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Gerenciar Membros - {selectedOrgForMembers?.name}</DialogTitle>
              <DialogDescription>
                Visualize os membros vinculados a esta organização.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto border rounded-md p-2">
              {loadingMembers ? (
                <div className="flex justify-center p-4">Carregando...</div>
              ) : members.length === 0 ? (
                <div className="text-center p-6">
                  <div className="text-muted-foreground mb-4">
                    Nenhum membro nesta organização.
                  </div>
                  <Button
                    onClick={() => {
                      setIsMembersDialogOpen(false);
                      navigate("/users");
                    }}
                  >
                    Ir para Usuários
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Papel na Org</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          {member.user?.first_name} {member.user?.last_name}
                        </TableCell>
                        <TableCell>
                          {member.role === 'admin' ? 'Administrador' : 'Membro (Visualizador)'}
                        </TableCell>
                        <TableCell>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="text-destructive hover:text-destructive hover:bg-destructive/10"
                             onClick={() => handleRemoveMember(member.user_id)}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty state helper */}
        {/* Quando não houver membros, mostrar orientação para cadastrar na tela de usuários */}
      </div>
    </PageLayout>
  );
}
