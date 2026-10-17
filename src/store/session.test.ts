import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "./useStore";
import type { StudentProfile } from "@/types";

const profile: StudentProfile = {
  id: "p1", firstName: "Camille", country: "France", level: "2nde", specialites: [], evalFormats: ["qcm"],
  goals: ["moyenne"], availability: [60, 60, 60, 60, 60, 60, 60], learningMode: true, createdAt: new Date().toISOString(),
};

describe("session", () => {
  beforeEach(() => useStore.getState().reset());

  it("se déconnecter garde les données, se reconnecter les retrouve", async () => {
    useStore.getState().completeOnboarding(profile, [{ id: "s1", name: "SVT", discipline: "svt", color: "#000", weight: 3, folders: [] }]);
    await useStore.getState().signOut();
    expect(useStore.getState().signedIn).toBe(false);
    expect(useStore.getState().profile?.firstName).toBe("Camille");
    expect(useStore.getState().subjects).toHaveLength(1);
    useStore.getState().signIn();
    expect(useStore.getState().signedIn).toBe(true);
  });

  it("la démo n'écrase pas le vrai profil, qui revient en quittant la démo", async () => {
    useStore.getState().completeOnboarding(profile, []);
    useStore.getState().loadDemo("lea");
    expect(useStore.getState().profile?.isDemo).toBe(true);
    useStore.getState().loadDemo("thomas"); // changer de profil démo garde la sauvegarde
    await useStore.getState().signOut(); // = quitter la démo
    const s = useStore.getState();
    expect(s.profile?.firstName).toBe("Camille");
    expect(s.profile?.isDemo).toBeFalsy();
    expect(s.signedIn).toBe(false);
    expect(s.backup).toBeUndefined();
  });

  it("quitter une démo sans profil réel revient à l'accueil vide", () => {
    useStore.getState().loadDemo("emma");
    useStore.getState().quitDemo();
    expect(useStore.getState().profile).toBeUndefined();
  });
});
