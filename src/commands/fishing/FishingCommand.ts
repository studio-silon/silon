import {ChatInputCommandInteraction, EmbedBuilder} from 'discord.js';
import {BaseCommand} from '../../core/BaseCommand';
import type {CommandResult} from '../../types/command.types';
import {fishingService} from '../../services/fishing.service';
import {ButtonStyle} from 'discord.js';
import {ActionRowBuilder, ButtonBuilder} from '@discordjs/builders';
import {CommandRegistry} from '../../core/CommandRegistry';
import {gameConfig} from '../../config/game.config';

const getRandomMessage = <T>(messageArray: T[]) => {
    return messageArray[Math.floor(Math.random() * messageArray.length)];
};

const commandRegistry = CommandRegistry.getInstance();

export class FishingCommand extends BaseCommand {
    constructor() {
        super({
            name: '낚시',
            description: '낚시를 시작합니다',
            requiresTextChannel: true,
        });
    }

    async handleCommand(interaction: ChatInputCommandInteraction): Promise<CommandResult> {
        const userId = interaction.user.id;
        const channelId = interaction.channelId;

        if (fishingService.isFishing(userId)) {
            return {
                content: '낚시를 할 때는 낚시에 집중하자...',
                success: false,
                ephemeral: true,
            };
        }

        const startResult = await fishingService.startFishing(userId, channelId);
        if (!startResult.success) {
            return {
                content: startResult.error || '낚시를 시작할 수 없어!',
                success: false,
                ephemeral: true,
            };
        }

        const catchRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('catch_fish').setLabel('낚싯줄 당기기 🎣').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('stop_fishing').setLabel('그만두기').setStyle(ButtonStyle.Secondary),
        );

        const embed = new EmbedBuilder().setTitle('**낚시찌를 던졌다! 🎣**').setColor(0x00ae86);

        const response = await interaction.reply({
            embeds: [embed],
            components: [catchRow],
            fetchReply: true,
        });

        const state = fishingService.getFishingState(userId);
        if (!state) {
            return {
                content: '낚시를 시작할 수 없어!',
                success: false,
                ephemeral: true,
            };
        }

        const waitTime = state.waitTime;
        const biteTime = state.biteTime;

        let isFake = Math.random() < 0.5;

        state.timers.push(
            setTimeout(async () => {
                if (fishingService.isFishing(userId)) {
                    const waitEmbed = new EmbedBuilder().setTitle('**기다리는 중... 🎣**').setDescription(getRandomMessage(gameConfig.fishing_wait)).setColor(0x00ae86);

                    await response.edit({
                        embeds: [waitEmbed],
                        components: [catchRow],
                    });

                    state.timers.push(
                        setTimeout(async () => {
                            if (fishingService.isFishing(userId)) {
                                if (isFake) {
                                    const fakeEmbed = new EmbedBuilder()
                                        .setTitle('**기다리는 중... 🎣**')
                                        .setDescription('앗!!! ' + getRandomMessage(gameConfig.fishing_fake))
                                        .setColor(0xff0000);

                                    await response.edit({
                                        embeds: [fakeEmbed],
                                        components: [catchRow],
                                    });

                                    state.timers.push(
                                        setTimeout(async () => {
                                            if (fishingService.isFishing(userId)) {
                                                const backToWaitEmbed = new EmbedBuilder()
                                                    .setTitle('**기다리는 중... 🎣**')
                                                    .setDescription(getRandomMessage(gameConfig.fishing_wait))
                                                    .setColor(0x00ae86);

                                                await response.edit({
                                                    embeds: [backToWaitEmbed],
                                                    components: [catchRow],
                                                });
                                            }
                                        }, 2000),
                                    );
                                } else {
                                    fishingService.setBitedTime(userId);
                                    const biteEmbed = new EmbedBuilder()
                                        .setTitle('**기다리는 중... 🎣**')
                                        .setDescription(getRandomMessage(gameConfig.fishing_true))
                                        .setColor(0xff0000);

                                    await response.edit({
                                        embeds: [biteEmbed],
                                        components: [catchRow],
                                    });

                                    state.timers.push(
                                        setTimeout(async () => {
                                            if (fishingService.isFishing(userId)) {
                                                fishingService.endFishing(userId);
                                                const escapeEmbed = new EmbedBuilder().setTitle('**낚시 실패**').setDescription('물고기가 도망갔다...').setColor(0xff0000);

                                                await response.edit({
                                                    embeds: [escapeEmbed],
                                                    components: [],
                                                });
                                            }
                                        }, 5000),
                                    );
                                }
                            }
                        }, biteTime),
                    );
                }
            }, waitTime),
        );

        return {content: '', success: true};
    }
}

commandRegistry.registerCommand(new FishingCommand());
