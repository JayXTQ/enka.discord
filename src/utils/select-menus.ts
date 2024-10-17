import {Hoyo, HoyoCharacters, NoProfile} from "../types/enka";
import {api, Characters, get, getGICharacters, getHSRCharacters} from "./api";
import {
    CacheType,
    Interaction,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import {emojiIds} from "./misc";

function getSortedAvatars(avatarOrder: Record<number, number>): string[] {
    return Object.entries(avatarOrder)
        .sort(([, orderA], [, orderB]) => orderA - orderB)
        .map(([avatar]) => avatar);
}

export async function selectCharacter(interaction: Interaction<CacheType>, name: string, profile: Hoyo, selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder().setMaxValues(1).setMinValues(1)) {
    const avatars = getSortedAvatars(profile.avatar_order as Record<number, number>);

    const characters = profile.hoyo_type === 0 ? await getGICharacters() : await getHSRCharacters();
    const builds = await api.hoyosBuilds(name, profile.hash);
    if(!builds) {
        return null;
    }
    const profileCharacters = (await Promise.all(avatars.map(async char => {
        const character = characters.find(character => character.characterId === char);
        if(!character) return null;
        if(!builds.data[character.characterId] || !builds.data[character.characterId].length) return null;
        const emojiId = emojiIds[`${profile.hoyo_type === 0 ? "GI" : "HSR"}${character.element}`];
        if(!emojiId) return null;
        return { character, builds: builds.data, emojiId };
    }))).filter((char): char is { character: Characters, builds: HoyoCharacters, emojiId: string } => char !== null);
    selectMenu.setCustomId("name_select_character")
    selectMenu.setPlaceholder("Select a character")
    selectMenu.setOptions(profileCharacters.map((char) => {
        return new StringSelectMenuOptionBuilder()
            .setLabel(char.character.name)
            .setValue(char.character.characterId)
            .setDescription(`Select a build for ${char.character.name}`)
            .setEmoji(char.emojiId)
    }))
    return selectMenu;
}

export async function selectUidCharacter(uid: string, game: string, selectMenu: StringSelectMenuBuilder = new StringSelectMenuBuilder().setMaxValues(1).setMinValues(1)) {
    const characters = game === "genshin" ? await getGICharacters() : await getHSRCharacters();
    const characterList = await api.uid(uid, game === "genshin" ? 0 : 1);
    if(!characterList) {
        return null;
    }
    const profileCharacters: Characters[] = [];
    if('detailInfo' in characterList.data){
        for(const char of characterList.data.detailInfo.avatarDetailList){
            const character = characters.find(character => character.characterId === char.avatarId.toString());
            if(!character) continue;
            profileCharacters.push(character);
        }
    } else {
        for(const char of characterList.data.avatarInfoList) {
            const character = characters.find(character => character.characterId === char.avatarId.toString());
            if(!character) continue;
            profileCharacters.push(character);
        }
    }
    selectMenu.setCustomId("uid_select_character")
    selectMenu.setPlaceholder("Select a character")
    selectMenu.setOptions(profileCharacters.map((char) => {
        return new StringSelectMenuOptionBuilder()
            .setLabel(char.name)
            .setValue(char.characterId)
            .setDescription(`Select a build for ${char.name}`)
            .setEmoji(emojiIds[`${game === "genshin" ? "GI" : "HSR"}${char.element}`])
    }))
    return selectMenu;
}