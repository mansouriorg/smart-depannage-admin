// src/lib/mock-data.ts

// --- DÉFINITIONS (TYPES) ---

export type TicketStatus = "EN_ATTENTE" | "AFFECTE" | "EN_COURS" | "TERMINE";

export type TicketType = "PLOMBERIE" | "ELECTRICITE" | "SERRURERIE" | "AUTRE";

export interface Ticket {
  id: string;
  clientName: string;
  clientPhone: string;
  type: TicketType;
  description: string;
  address: string;
  status: TicketStatus;
  date: string; // Format ISO string pour faciliter la gestion des dates
  technician?: string; // Optionnel : Nom du technicien si affecté
}

// --- DONNÉES FACTICES (MOCK DATA) ---

export const MOCK_TICKETS: Ticket[] = [
  {
    id: "TICK-2026-001",
    clientName: "Amine Ben Salem",
    clientPhone: "20 123 456",
    type: "PLOMBERIE",
    description: "Fuite d'eau importante sous l'évier de la cuisine. Risque d'inondation imminent.",
    address: "15 Rue de la Marsa, Sidi Bou Said",
    status: "EN_ATTENTE", // Statut critique (Or)
    date: "2026-02-05T08:30:00",
  },
  {
    id: "TICK-2026-002",
    clientName: "Sarah M.",
    clientPhone: "55 987 654",
    type: "ELECTRICITE",
    description: "Coupure de courant totale dans l'appartement suite aux orages d'hier.",
    address: "Résidence Les Pins, Apt 4B, Lac 2",
    status: "AFFECTE", // Statut Info (Bleu)
    date: "2026-02-05T09:15:00",
    technician: "Sami B.",
  },
  {
    id: "TICK-2026-003",
    clientName: "Karim Z.",
    clientPhone: "98 000 111",
    type: "SERRURERIE",
    description: "Porte d'entrée blindée claquée avec les clés à l'intérieur. Bébé seul dans l'appart.",
    address: "Av. Habib Bourguiba, Ariana",
    status: "TERMINE", // Statut Succès (Vert)
    date: "2026-02-04T18:00:00",
    technician: "Mounir Serrurerie",
  },
  {
    id: "TICK-2026-004",
    clientName: "Leila K.",
    clientPhone: "22 333 444",
    type: "PLOMBERIE",
    description: "Chauffe-eau en panne, pas d'eau chaude depuis 2 jours.",
    address: "Rue Hedi Chaker, Le Bardo",
    status: "EN_COURS", // Statut Actif (Violet)
    date: "2026-02-05T10:00:00",
    technician: "Ahmed Plombier",
  },
  {
    id: "TICK-2026-005",
    clientName: "Syndic Résidence Ennasr",
    clientPhone: "71 111 222",
    type: "ELECTRICITE",
    description: "Panne d'éclairage dans les parties communes (Cage d'escalier Bloc C).",
    address: "Avenue X20, Ennasr 2",
    status: "EN_ATTENTE",
    date: "2026-02-05T11:45:00",
  },
  {
    id: "TICK-2026-006",
    clientName: "Mourad T.",
    clientPhone: "50 555 666",
    type: "AUTRE",
    description: "Installation de climatiseur (unité extérieure).",
    address: "Cité El Khadra, Tunis",
    status: "AFFECTE",
    date: "2026-02-05T12:00:00",
    technician: "Froid Service",
  },
];