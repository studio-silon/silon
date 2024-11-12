import {EmbedBuilder} from 'discord.js';
import {BaseCommand} from '../../core/BaseCommand';
import {FacilityService} from '../../services/facility.service';
import {CommandRegistry} from '../../core/CommandRegistry';
import {gameConfig} from '../../config/game.config';
import {FishingSpot} from '../../models/FishingSpot';
import {deepCopy} from '../../utils/deepCopy.util';
import {rateNames} from '../../types';
const commandRegistry = CommandRegistry.getInstance();
export class AnalyzeFishTypesCommand extends BaseCommand {
    constructor() {
        super({
            name: '물고기분석',
            description: '물고기 종류를 분석합니다.',
        });
    }
    async handleCommand(interaction) {
        const channelId = interaction.channelId;
        const spot = await FishingSpot.findOne({where: {channelId}});
        if (!spot) {
            return {
                content: '이 채널에는 낚시터가 없어!',
                success: false,
                ephemeral: true,
            };
        }

        const fishTypes = deepCopy(gameConfig.terrains[spot.terrain].fishTypes);
        const rateData = {
            common: {count: 0, chance: 0, fishNames: []},
            uncommon: {count: 0, chance: 0, fishNames: []},
            rare: {count: 0, chance: 0, fishNames: []},
            epic: {count: 0, chance: 0, fishNames: []},
            legendary: {count: 0, chance: 0, fishNames: []},
            'ultra-legendary': {count: 0, chance: 0, fishNames: []},
            trash: {count: 0, chance: 0, fishNames: []},
        };
        for (const fish of fishTypes) {
            if (fish.rate === 'secret') continue;
            for (const facilityName of spot.facilities) {
                const facility = FacilityService.getFacilityInfo(facilityName);
                if (facility) facility.adjustFishChance(fish, spot.cleanliness);
            }
            const rate = fish.type === 'trash' ? 'trash' : fish.rate || 'common';
            rateData[rate].count++;
            rateData[rate].chance += fish.chance;
            if (rateData[rate].fishNames.length < 2) rateData[rate].fishNames.push(fish.name);
        }
        const totalChance = Object.values(rateData).reduce((sum, data) => sum + data.chance, 0);
        const fields = Object.entries(rateData).map(([rate, data]) => ({
            name: rate === 'trash' ? '쓰레기' : rateNames[rate],
            value: `${data.fishNames.length > 0 ? data.fishNames.join(', ') + ' 등 ' : ''}총 ${data.count}종 \`확률 ${((data.chance / totalChance) * 100).toFixed(2)}%\``,
            inline: true,
        }));
        const embed = new EmbedBuilder().setTitle(':fish: 물고기 종류 분석').setColor(0x00ae86).setDescription(`총 ${fishTypes.length}종`).addFields(fields);
        return {
            embeds: [embed],
            content: '',
            success: true,
        };
    }
}
commandRegistry.registerCommand(new AnalyzeFishTypesCommand());
