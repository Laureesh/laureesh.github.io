import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { SupportedLanguage } from "../types/models";

type UiMessageKey =
  | "recentlyVisited"
  | "historyEmpty"
  | "currentPage"
  | "keyboardShortcuts"
  | "openCommandPalette"
  | "showKeyboardShortcuts"
  | "goTo"
  | "mobileSwipe"
  | "closeOverlays"
  | "navigateCommandPalette"
  | "openSelectedResult"
  | "close"
  | "profile"
  | "community"
  | "accountSettings"
  | "switchAccount"
  | "signOut"
  | "adminDashboard"
  | "memberships"
  | "displayLanguage"
  | "settings"
  | "contactPage"
  | "signIn"
  | "createAccount"
  | "admin"
  | "member"
  | "searchPagesActions"
  | "clearCommandPaletteSearch"
  | "noResultsFound"
  | "switchToLightMode"
  | "switchToDarkMode"
  | "navigate"
  | "open"
  | "footerTagline"
  | "allRightsReserved"
  | "preferences"
  | "settingsDescription"
  | "currentPreferences"
  | "language"
  | "visibility"
  | "securityAlerts"
  | "securityAlertsDescription"
  | "marketingEmails"
  | "languageControl"
  | "languageControlDescription"
  | "alertsAndNotifications"
  | "alertsAndNotificationsDescription"
  | "accountActivityEmails"
  | "accountActivityEmailsDescription"
  | "productUpdates"
  | "productUpdatesDescription"
  | "marketingEmailsDescription"
  | "visibilityAndExperience"
  | "visibilityAndExperienceDescription"
  | "makeProfileVisible"
  | "makeProfileVisibleDescription"
  | "saveSettings"
  | "settingsSaved"
  | "unableToSaveSettings"
  | "unableToSaveLanguagePreference"
  | "userMenu"
  | "toggleMenu"
  | "currentAccount"
  | "public"
  | "private"
  | "on"
  | "off";

interface DisplayLanguageContextValue {
  currentLanguage: SupportedLanguage;
  t: (key: UiMessageKey) => string;
  translateRouteLabel: (label: string) => string;
  getLanguageLabel: (language: SupportedLanguage) => string;
  getLanguageOptionLabel: (language: SupportedLanguage) => string;
}

const uiMessages: Record<SupportedLanguage, Record<UiMessageKey, string>> = {
  en: {
    recentlyVisited: "Recently visited",
    historyEmpty: "Your page history will show up here.",
    currentPage: "Current page",
    keyboardShortcuts: "Keyboard Shortcuts",
    openCommandPalette: "Open command palette",
    showKeyboardShortcuts: "Show keyboard shortcuts",
    goTo: "Go to",
    mobileSwipe: "Move between top-level pages on mobile",
    closeOverlays: "Close overlays",
    navigateCommandPalette: "Navigate command palette",
    openSelectedResult: "Open selected result",
    close: "Close",
    profile: "Profile",
    community: "Community",
    accountSettings: "Account Settings",
    switchAccount: "Switch Account",
    signOut: "Sign Out",
    adminDashboard: "Admin Dashboard",
    memberships: "Purchases and Memberships",
    displayLanguage: "Display Language",
    settings: "Settings",
    contactPage: "Contact Page",
    signIn: "Sign In",
    createAccount: "Create Account",
    admin: "Admin",
    member: "Member",
    searchPagesActions: "Search pages, actions...",
    clearCommandPaletteSearch: "Clear command palette search",
    noResultsFound: "No results found",
    switchToLightMode: "Switch to light mode",
    switchToDarkMode: "Switch to dark mode",
    navigate: "Navigate",
    open: "Open",
    footerTagline: "Software Developer & IT Student",
    allRightsReserved: "All Rights Reserved.",
    preferences: "Preferences",
    settingsDescription: "Control alerts, communication, and the broader account preferences that should persist across your signed-in experience.",
    currentPreferences: "Current preferences",
    language: "Language",
    visibility: "Visibility",
    securityAlerts: "Security alerts",
    securityAlertsDescription: "Get warned about sign-ins, risky changes, and future account protection events.",
    marketingEmails: "Marketing emails",
    languageControl: "Language control",
    languageControlDescription: "Display language now lives directly in the avatar dropdown so it is faster to reach from anywhere.",
    alertsAndNotifications: "Alerts and notifications",
    alertsAndNotificationsDescription: "Turn on the messages you actually want, and keep the noise down everywhere else.",
    accountActivityEmails: "Account activity emails",
    accountActivityEmailsDescription: "Get updates when account-level changes or profile edits happen.",
    productUpdates: "Product updates",
    productUpdatesDescription: "Hear about major new tools, page upgrades, and dashboard additions.",
    marketingEmailsDescription: "Opt in only if you want occasional future announcements, launches, or offers.",
    visibilityAndExperience: "Visibility and experience",
    visibilityAndExperienceDescription: "Keep your profile discoverable when you want opportunities, or keep it private when you just want the account tools.",
    makeProfileVisible: "Make my account profile visible to other signed-in users",
    makeProfileVisibleDescription: "This controls discovery in future community and shared portfolio views.",
    saveSettings: "Save settings",
    settingsSaved: "Settings saved.",
    unableToSaveSettings: "Unable to save settings.",
    unableToSaveLanguagePreference: "Unable to save language preference right now.",
    userMenu: "User menu",
    toggleMenu: "Toggle menu",
    currentAccount: "Current account",
    public: "Public",
    private: "Private",
    on: "On",
    off: "Off",
  },
  es: {
    recentlyVisited: "Visitado recientemente",
    historyEmpty: "Tu historial de paginas aparecera aqui.",
    currentPage: "Pagina actual",
    keyboardShortcuts: "Atajos de teclado",
    openCommandPalette: "Abrir paleta de comandos",
    showKeyboardShortcuts: "Mostrar atajos de teclado",
    goTo: "Ir a",
    mobileSwipe: "Moverse entre paginas principales en movil",
    closeOverlays: "Cerrar paneles",
    navigateCommandPalette: "Navegar la paleta de comandos",
    openSelectedResult: "Abrir resultado seleccionado",
    close: "Cerrar",
    profile: "Perfil",
    community: "Comunidad",
    accountSettings: "Configuracion de cuenta",
    switchAccount: "Cambiar cuenta",
    signOut: "Cerrar sesion",
    adminDashboard: "Panel de administracion",
    memberships: "Compras y membresias",
    displayLanguage: "Idioma de pantalla",
    settings: "Configuracion",
    contactPage: "Pagina de contacto",
    signIn: "Iniciar sesion",
    createAccount: "Crear cuenta",
    admin: "Administrador",
    member: "Miembro",
    searchPagesActions: "Buscar paginas y acciones...",
    clearCommandPaletteSearch: "Borrar busqueda de la paleta de comandos",
    noResultsFound: "No se encontraron resultados",
    switchToLightMode: "Cambiar a modo claro",
    switchToDarkMode: "Cambiar a modo oscuro",
    navigate: "Navegar",
    open: "Abrir",
    footerTagline: "Desarrollador de software y estudiante de IT",
    allRightsReserved: "Todos los derechos reservados.",
    preferences: "Preferencias",
    settingsDescription: "Controla alertas, comunicacion y las preferencias generales de la cuenta que deben mantenerse en toda tu experiencia con sesion iniciada.",
    currentPreferences: "Preferencias actuales",
    language: "Idioma",
    visibility: "Visibilidad",
    securityAlerts: "Alertas de seguridad",
    securityAlertsDescription: "Recibe avisos sobre inicios de sesion, cambios riesgosos y futuros eventos de proteccion de la cuenta.",
    marketingEmails: "Correos de marketing",
    languageControl: "Control de idioma",
    languageControlDescription: "El idioma de pantalla ahora vive directamente en el menu del avatar para que sea mas rapido acceder desde cualquier lugar.",
    alertsAndNotifications: "Alertas y notificaciones",
    alertsAndNotificationsDescription: "Activa solo los mensajes que realmente quieres y reduce el ruido en todas partes.",
    accountActivityEmails: "Correos de actividad de la cuenta",
    accountActivityEmailsDescription: "Recibe actualizaciones cuando haya cambios en la cuenta o ediciones del perfil.",
    productUpdates: "Actualizaciones del producto",
    productUpdatesDescription: "Recibe noticias sobre nuevas herramientas, mejoras de paginas y funciones del panel.",
    marketingEmailsDescription: "Activa esto solo si quieres anuncios, lanzamientos u ofertas ocasionales.",
    visibilityAndExperience: "Visibilidad y experiencia",
    visibilityAndExperienceDescription: "Manten tu perfil visible cuando busques oportunidades, o privado cuando solo quieras las herramientas de la cuenta.",
    makeProfileVisible: "Hacer visible mi perfil a otros usuarios con sesion iniciada",
    makeProfileVisibleDescription: "Esto controla el descubrimiento en futuras vistas de comunidad y portafolios compartidos.",
    saveSettings: "Guardar configuracion",
    settingsSaved: "Configuracion guardada.",
    unableToSaveSettings: "No se pudo guardar la configuracion.",
    unableToSaveLanguagePreference: "No se pudo guardar la preferencia de idioma en este momento.",
    userMenu: "Menu de usuario",
    toggleMenu: "Alternar menu",
    currentAccount: "Cuenta actual",
    public: "Publico",
    private: "Privado",
    on: "Activado",
    off: "Desactivado",
  },
  fr: {
    recentlyVisited: "Visite recemment",
    historyEmpty: "Votre historique de pages apparaitra ici.",
    currentPage: "Page actuelle",
    keyboardShortcuts: "Raccourcis clavier",
    openCommandPalette: "Ouvrir la palette de commandes",
    showKeyboardShortcuts: "Afficher les raccourcis clavier",
    goTo: "Aller a",
    mobileSwipe: "Passer entre les pages principales sur mobile",
    closeOverlays: "Fermer les panneaux",
    navigateCommandPalette: "Parcourir la palette de commandes",
    openSelectedResult: "Ouvrir le resultat selectionne",
    close: "Fermer",
    profile: "Profil",
    community: "Communaute",
    accountSettings: "Parametres du compte",
    switchAccount: "Changer de compte",
    signOut: "Se deconnecter",
    adminDashboard: "Tableau de bord admin",
    memberships: "Achats et abonnements",
    displayLanguage: "Langue d'affichage",
    settings: "Parametres",
    contactPage: "Page de contact",
    signIn: "Se connecter",
    createAccount: "Creer un compte",
    admin: "Admin",
    member: "Membre",
    searchPagesActions: "Rechercher des pages et des actions...",
    clearCommandPaletteSearch: "Effacer la recherche de la palette de commandes",
    noResultsFound: "Aucun resultat",
    switchToLightMode: "Passer en mode clair",
    switchToDarkMode: "Passer en mode sombre",
    navigate: "Naviguer",
    open: "Ouvrir",
    footerTagline: "Developpeur logiciel et etudiant en IT",
    allRightsReserved: "Tous droits reserves.",
    preferences: "Preferences",
    settingsDescription: "Controlez les alertes, la communication et les preferences generales du compte qui doivent rester actives pendant votre experience connectee.",
    currentPreferences: "Preferences actuelles",
    language: "Langue",
    visibility: "Visibilite",
    securityAlerts: "Alertes de securite",
    securityAlertsDescription: "Recevez des alertes pour les connexions, les changements a risque et les futurs evenements de protection du compte.",
    marketingEmails: "Emails marketing",
    languageControl: "Controle de la langue",
    languageControlDescription: "La langue d'affichage se trouve maintenant directement dans le menu de l'avatar pour y acceder plus vite depuis n'importe ou.",
    alertsAndNotifications: "Alertes et notifications",
    alertsAndNotificationsDescription: "Activez seulement les messages que vous voulez vraiment et reduisez le bruit partout ailleurs.",
    accountActivityEmails: "Emails d'activite du compte",
    accountActivityEmailsDescription: "Recevez des mises a jour lorsque des changements de compte ou de profil se produisent.",
    productUpdates: "Mises a jour produit",
    productUpdatesDescription: "Recevez les nouvelles sur les outils, les pages et les nouveautes du tableau de bord.",
    marketingEmailsDescription: "Activez ceci seulement si vous voulez des annonces, lancements ou offres occasionnels.",
    visibilityAndExperience: "Visibilite et experience",
    visibilityAndExperienceDescription: "Gardez votre profil visible lorsque vous cherchez des opportunites, ou prive lorsque vous voulez seulement les outils du compte.",
    makeProfileVisible: "Rendre mon profil visible aux autres utilisateurs connectes",
    makeProfileVisibleDescription: "Cela controle la decouverte dans les futures vues communautaires et portfolios partages.",
    saveSettings: "Enregistrer les parametres",
    settingsSaved: "Parametres enregistres.",
    unableToSaveSettings: "Impossible d'enregistrer les parametres.",
    unableToSaveLanguagePreference: "Impossible d'enregistrer la preference de langue pour le moment.",
    userMenu: "Menu utilisateur",
    toggleMenu: "Basculer le menu",
    currentAccount: "Compte actuel",
    public: "Public",
    private: "Prive",
    on: "Active",
    off: "Desactive",
  },
  de: {
    recentlyVisited: "Zuletzt besucht",
    historyEmpty: "Dein Seitenverlauf wird hier angezeigt.",
    currentPage: "Aktuelle Seite",
    keyboardShortcuts: "Tastenkurzel",
    openCommandPalette: "Befehlspalette offnen",
    showKeyboardShortcuts: "Tastenkurzel anzeigen",
    goTo: "Gehe zu",
    mobileSwipe: "Zwischen Hauptseiten auf Mobilgeraten wechseln",
    closeOverlays: "Overlays schliessen",
    navigateCommandPalette: "In der Befehlspalette navigieren",
    openSelectedResult: "Ausgewahltes Ergebnis offnen",
    close: "Schliessen",
    profile: "Profil",
    community: "Community",
    accountSettings: "Kontoeinstellungen",
    switchAccount: "Konto wechseln",
    signOut: "Abmelden",
    adminDashboard: "Admin-Dashboard",
    memberships: "Kaufe und Mitgliedschaften",
    displayLanguage: "Anzeigesprache",
    settings: "Einstellungen",
    contactPage: "Kontaktseite",
    signIn: "Anmelden",
    createAccount: "Konto erstellen",
    admin: "Admin",
    member: "Mitglied",
    searchPagesActions: "Seiten und Aktionen durchsuchen...",
    clearCommandPaletteSearch: "Suche der Befehlspalette loschen",
    noResultsFound: "Keine Ergebnisse gefunden",
    switchToLightMode: "Zum hellen Modus wechseln",
    switchToDarkMode: "Zum dunklen Modus wechseln",
    navigate: "Navigieren",
    open: "Offnen",
    footerTagline: "Softwareentwickler und IT-Student",
    allRightsReserved: "Alle Rechte vorbehalten.",
    preferences: "Einstellungen",
    settingsDescription: "Steuere Hinweise, Kommunikation und die allgemeinen Kontoeinstellungen, die in deiner angemeldeten Nutzung erhalten bleiben sollen.",
    currentPreferences: "Aktuelle Einstellungen",
    language: "Sprache",
    visibility: "Sichtbarkeit",
    securityAlerts: "Sicherheitswarnungen",
    securityAlertsDescription: "Erhalte Warnungen zu Anmeldungen, riskanten Anderungen und kunftigen Schutzereignissen fur dein Konto.",
    marketingEmails: "Marketing-E-Mails",
    languageControl: "Sprachsteuerung",
    languageControlDescription: "Die Anzeigesprache befindet sich jetzt direkt im Avatar-Menu, damit sie von uberall schneller erreichbar ist.",
    alertsAndNotifications: "Benachrichtigungen und Hinweise",
    alertsAndNotificationsDescription: "Aktiviere nur die Nachrichten, die du wirklich willst, und reduziere den Rest.",
    accountActivityEmails: "E-Mails zu Kontoaktivitat",
    accountActivityEmailsDescription: "Erhalte Updates, wenn Kontoanderungen oder Profilbearbeitungen stattfinden.",
    productUpdates: "Produktupdates",
    productUpdatesDescription: "Erhalte Infos zu neuen Tools, Seitenverbesserungen und Dashboard-Funktionen.",
    marketingEmailsDescription: "Aktiviere dies nur, wenn du gelegentliche Ankundigungen, Starts oder Angebote erhalten willst.",
    visibilityAndExperience: "Sichtbarkeit und Erfahrung",
    visibilityAndExperienceDescription: "Halte dein Profil sichtbar, wenn du Chancen suchst, oder privat, wenn du nur die Kontotools willst.",
    makeProfileVisible: "Mein Profil fur andere eingeloggte Nutzer sichtbar machen",
    makeProfileVisibleDescription: "Dies steuert die Sichtbarkeit in zukunftigen Community- und geteilten Portfolioansichten.",
    saveSettings: "Einstellungen speichern",
    settingsSaved: "Einstellungen gespeichert.",
    unableToSaveSettings: "Einstellungen konnten nicht gespeichert werden.",
    unableToSaveLanguagePreference: "Die Spracheinstellung konnte gerade nicht gespeichert werden.",
    userMenu: "Benutzermenu",
    toggleMenu: "Menu umschalten",
    currentAccount: "Aktuelles Konto",
    public: "Offentlich",
    private: "Privat",
    on: "Ein",
    off: "Aus",
  },
  "pt-BR": {
    recentlyVisited: "Visitado recentemente",
    historyEmpty: "Seu historico de paginas aparecera aqui.",
    currentPage: "Pagina atual",
    keyboardShortcuts: "Atalhos de teclado",
    openCommandPalette: "Abrir paleta de comandos",
    showKeyboardShortcuts: "Mostrar atalhos de teclado",
    goTo: "Ir para",
    mobileSwipe: "Mover entre paginas principais no celular",
    closeOverlays: "Fechar paineis",
    navigateCommandPalette: "Navegar pela paleta de comandos",
    openSelectedResult: "Abrir resultado selecionado",
    close: "Fechar",
    profile: "Perfil",
    community: "Comunidade",
    accountSettings: "Configuracoes da conta",
    switchAccount: "Trocar conta",
    signOut: "Sair",
    adminDashboard: "Painel administrativo",
    memberships: "Compras e assinaturas",
    displayLanguage: "Idioma de exibicao",
    settings: "Configuracoes",
    contactPage: "Pagina de contato",
    signIn: "Entrar",
    createAccount: "Criar conta",
    admin: "Admin",
    member: "Membro",
    searchPagesActions: "Buscar paginas e acoes...",
    clearCommandPaletteSearch: "Limpar busca da paleta de comandos",
    noResultsFound: "Nenhum resultado encontrado",
    switchToLightMode: "Mudar para modo claro",
    switchToDarkMode: "Mudar para modo escuro",
    navigate: "Navegar",
    open: "Abrir",
    footerTagline: "Desenvolvedor de software e estudante de TI",
    allRightsReserved: "Todos os direitos reservados.",
    preferences: "Preferencias",
    settingsDescription: "Controle alertas, comunicacao e as preferencias gerais da conta que devem persistir em toda a sua experiencia logada.",
    currentPreferences: "Preferencias atuais",
    language: "Idioma",
    visibility: "Visibilidade",
    securityAlerts: "Alertas de seguranca",
    securityAlertsDescription: "Receba avisos sobre logins, mudancas arriscadas e futuros eventos de protecao da conta.",
    marketingEmails: "Emails de marketing",
    languageControl: "Controle de idioma",
    languageControlDescription: "O idioma de exibicao agora fica diretamente no menu do avatar para ser mais rapido de acessar de qualquer lugar.",
    alertsAndNotifications: "Alertas e notificacoes",
    alertsAndNotificationsDescription: "Ative so as mensagens que voce realmente quer e reduza o restante.",
    accountActivityEmails: "Emails de atividade da conta",
    accountActivityEmailsDescription: "Receba atualizacoes quando houver mudancas na conta ou edicoes no perfil.",
    productUpdates: "Atualizacoes do produto",
    productUpdatesDescription: "Receba noticias sobre novas ferramentas, melhorias de paginas e recursos do painel.",
    marketingEmailsDescription: "Ative isso so se quiser anuncios, lancamentos ou ofertas ocasionais.",
    visibilityAndExperience: "Visibilidade e experiencia",
    visibilityAndExperienceDescription: "Mantenha seu perfil visivel quando quiser oportunidades, ou privado quando quiser apenas as ferramentas da conta.",
    makeProfileVisible: "Tornar meu perfil visivel para outros usuarios logados",
    makeProfileVisibleDescription: "Isso controla a descoberta em futuras visualizacoes da comunidade e portfolios compartilhados.",
    saveSettings: "Salvar configuracoes",
    settingsSaved: "Configuracoes salvas.",
    unableToSaveSettings: "Nao foi possivel salvar as configuracoes.",
    unableToSaveLanguagePreference: "Nao foi possivel salvar a preferencia de idioma agora.",
    userMenu: "Menu do usuario",
    toggleMenu: "Alternar menu",
    currentAccount: "Conta atual",
    public: "Publico",
    private: "Privado",
    on: "Ligado",
    off: "Desligado",
  },
};

const routeLabelTranslations: Record<SupportedLanguage, Record<string, string>> = {
  en: {},
  es: {
    Home: "Inicio",
    About: "Acerca de",
    Skills: "Habilidades",
    Projects: "Proyectos",
    Blog: "Blog",
    "Blog Archive": "Archivo del blog",
    Resume: "Curriculo",
    Contact: "Contacto",
    Community: "Comunidad",
    Profile: "Perfil",
    "Account Settings": "Configuracion de cuenta",
    "Purchases and Memberships": "Compras y membresias",
    Settings: "Configuracion",
    "Admin Dashboard": "Panel de administracion",
    "Admin Content": "Contenido admin",
    "Admin Pages": "Paginas admin",
    "Admin Users": "Usuarios admin",
    "Admin Tasks": "Tareas admin",
    "Private Pages": "Paginas privadas",
    "Food Routine": "Rutina de comida",
    "Face Routine": "Rutina facial",
    "UEFN Leaderboard Manager": "Administrador de clasificacion UEFN",
    "Sign In": "Iniciar sesion",
    "Create Account": "Crear cuenta",
    "Member Portfolio": "Portafolio de miembro",
    "Not Found": "No encontrado",
  },
  fr: {
    Home: "Accueil",
    About: "A propos",
    Skills: "Competences",
    Projects: "Projets",
    Blog: "Blog",
    "Blog Archive": "Archive du blog",
    Resume: "CV",
    Contact: "Contact",
    Community: "Communaute",
    Profile: "Profil",
    "Account Settings": "Parametres du compte",
    "Purchases and Memberships": "Achats et abonnements",
    Settings: "Parametres",
    "Admin Dashboard": "Tableau de bord admin",
    "Admin Content": "Contenu admin",
    "Admin Pages": "Pages admin",
    "Admin Users": "Utilisateurs admin",
    "Admin Tasks": "Taches admin",
    "Private Pages": "Pages privees",
    "Food Routine": "Routine alimentaire",
    "Face Routine": "Routine visage",
    "UEFN Leaderboard Manager": "Gestionnaire de classement UEFN",
    "Sign In": "Se connecter",
    "Create Account": "Creer un compte",
    "Member Portfolio": "Portfolio membre",
    "Not Found": "Introuvable",
  },
  de: {
    Home: "Startseite",
    About: "Uber",
    Skills: "Kenntnisse",
    Projects: "Projekte",
    Blog: "Blog",
    "Blog Archive": "Blog-Archiv",
    Resume: "Lebenslauf",
    Contact: "Kontakt",
    Community: "Community",
    Profile: "Profil",
    "Account Settings": "Kontoeinstellungen",
    "Purchases and Memberships": "Kaufe und Mitgliedschaften",
    Settings: "Einstellungen",
    "Admin Dashboard": "Admin-Dashboard",
    "Admin Content": "Admin-Inhalte",
    "Admin Pages": "Admin-Seiten",
    "Admin Users": "Admin-Benutzer",
    "Admin Tasks": "Admin-Aufgaben",
    "Private Pages": "Private Seiten",
    "Food Routine": "Ernahrungsroutine",
    "Face Routine": "Gesichtsroutine",
    "UEFN Leaderboard Manager": "UEFN-Bestenlistenmanager",
    "Sign In": "Anmelden",
    "Create Account": "Konto erstellen",
    "Member Portfolio": "Mitglieder-Portfolio",
    "Not Found": "Nicht gefunden",
  },
  "pt-BR": {
    Home: "Inicio",
    About: "Sobre",
    Skills: "Habilidades",
    Projects: "Projetos",
    Blog: "Blog",
    "Blog Archive": "Arquivo do blog",
    Resume: "Curriculo",
    Contact: "Contato",
    Community: "Comunidade",
    Profile: "Perfil",
    "Account Settings": "Configuracoes da conta",
    "Purchases and Memberships": "Compras e assinaturas",
    Settings: "Configuracoes",
    "Admin Dashboard": "Painel administrativo",
    "Admin Content": "Conteudo admin",
    "Admin Pages": "Paginas admin",
    "Admin Users": "Usuarios admin",
    "Admin Tasks": "Tarefas admin",
    "Private Pages": "Paginas privadas",
    "Food Routine": "Rotina alimentar",
    "Face Routine": "Rotina facial",
    "UEFN Leaderboard Manager": "Gerenciador de ranking UEFN",
    "Sign In": "Entrar",
    "Create Account": "Criar conta",
    "Member Portfolio": "Portfolio do membro",
    "Not Found": "Nao encontrado",
  },
};

const localizedLanguageLabels: Record<SupportedLanguage, Record<SupportedLanguage, string>> = {
  en: {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    "pt-BR": "Portuguese (Brazil)",
  },
  es: {
    en: "Ingles",
    es: "Espanol",
    fr: "Frances",
    de: "Aleman",
    "pt-BR": "Portugues (Brasil)",
  },
  fr: {
    en: "Anglais",
    es: "Espagnol",
    fr: "Francais",
    de: "Allemand",
    "pt-BR": "Portugais (Bresil)",
  },
  de: {
    en: "Englisch",
    es: "Spanisch",
    fr: "Franzosisch",
    de: "Deutsch",
    "pt-BR": "Portugiesisch (Brasilien)",
  },
  "pt-BR": {
    en: "Ingles",
    es: "Espanhol",
    fr: "Frances",
    de: "Alemao",
    "pt-BR": "Portugues (Brasil)",
  },
};

const DisplayLanguageContext = createContext<DisplayLanguageContextValue | null>(null);

export function DisplayLanguageProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const currentLanguage = userProfile?.preferences.language ?? "en";

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const value = useMemo<DisplayLanguageContextValue>(() => ({
    currentLanguage,
    t: (key) => uiMessages[currentLanguage][key] ?? uiMessages.en[key],
    translateRouteLabel: (label) => routeLabelTranslations[currentLanguage][label] ?? label,
    getLanguageLabel: (language) =>
      localizedLanguageLabels[currentLanguage][language] ?? localizedLanguageLabels.en[language],
    getLanguageOptionLabel: (language) => {
      const localizedLabel =
        localizedLanguageLabels[currentLanguage][language] ?? localizedLanguageLabels.en[language];
      const englishLabel = localizedLanguageLabels.en[language];

      return `${localizedLabel} (${englishLabel})`;
    },
  }), [currentLanguage]);

  return (
    <DisplayLanguageContext.Provider value={value}>
      {children}
    </DisplayLanguageContext.Provider>
  );
}

export function useDisplayLanguage() {
  const context = useContext(DisplayLanguageContext);

  if (!context) {
    throw new Error("useDisplayLanguage must be used within a DisplayLanguageProvider");
  }

  return context;
}
