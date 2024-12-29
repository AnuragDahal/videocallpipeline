export enum ENUM {
    MALE = "male",
    FEMALE = "female",
    ANY = "any",
}

export const switchPreference = (preference: string) => {
    switch (preference) {
        case ENUM.MALE:
            return ENUM.FEMALE;
        case ENUM.FEMALE:
            return ENUM.MALE;
        case ENUM.ANY:
            return ENUM.ANY;
        default:
            return ENUM.ANY; // Default case to handle unexpected values
    }
};