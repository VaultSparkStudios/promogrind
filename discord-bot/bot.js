import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';

// ── Environment variables ──────────────────────────────────────────────────────
const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CHANNEL_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_CHANNEL_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables. Check .env / your environment.');
  process.exit(1);
}

// ── Supabase client ────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Discord client ─────────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ── Slash command definitions ──────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('promos')
    .setDescription('Get the current top 5 community promos'),

  new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Browse PromoGrind calculators')
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Calculator type (optional)')
        .setRequired(false)
        .addChoices(
          { name: 'Arb Calculator', value: 'arb' },
          { name: 'Bonus Bet Converter', value: 'bonus-bet' },
          { name: 'No-Vig Calculator', value: 'no-vig' },
          { name: 'EV Calculator', value: 'ev' },
          { name: 'Kelly Criterion', value: 'kelly' },
          { name: 'Parlay Hedge', value: 'parlay-hedge' },
          { name: 'Profit Boost', value: 'profit-boost' },
          { name: 'All Calculators', value: 'all' }
        )
    ),
].map((cmd) => cmd.toJSON());

// ── Calculator metadata ────────────────────────────────────────────────────────
const CALC_META = {
  arb: {
    label: 'Arb Calculator',
    path: 'arb-2way',
    desc: 'Find guaranteed profit by betting both sides across sportsbooks.',
  },
  'bonus-bet': {
    label: 'Bonus Bet Converter',
    path: 'bonus-bet',
    desc: 'Convert a free bet / bonus bet token into guaranteed cash.',
  },
  'no-vig': {
    label: 'No-Vig Calculator',
    path: 'no-vig',
    desc: 'Strip the sportsbook margin to find the true implied probability.',
  },
  ev: {
    label: 'EV Calculator',
    path: 'ev',
    desc: 'Calculate expected value to identify +EV bets.',
  },
  kelly: {
    label: 'Kelly Criterion',
    path: 'kelly',
    desc: 'Size your bets optimally based on edge and bankroll.',
  },
  'parlay-hedge': {
    label: 'Parlay Hedge',
    path: 'parlay-hedge',
    desc: 'Lock in profit or cut losses on a running parlay.',
  },
  'profit-boost': {
    label: 'Profit Boost',
    path: 'profit-boost',
    desc: 'Calculate the true value of an odds boost promotion.',
  },
  all: {
    label: 'All 27 Calculators',
    path: '',
    desc: 'Access the full PromoGrind calculator suite — all free.',
  },
};

const BASE_URL = 'https://vaultsparkstudios.com/promogrind/';

// ── Fetch top promos from Supabase ─────────────────────────────────────────────
async function fetchTopPromos({ last24h = false } = {}) {
  let query = supabase
    .from('community_promos')
    .select('id, book_name, promo_type, promo_value, upvotes, created_at')
    .order('upvotes', { ascending: false })
    .limit(5);

  if (last24h) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error fetching promos:', error.message);
    return null;
  }

  // If last24h returned nothing, fall back to all-time top 5
  if (last24h && (!data || data.length === 0)) {
    return fetchTopPromos({ last24h: false });
  }

  return data ?? [];
}

// ── Build promo embed ──────────────────────────────────────────────────────────
function buildPromoEmbed(promos, { isDaily = false } = {}) {
  const title = isDaily
    ? '📋 PromoGrind — Top Community Promos Today'
    : '🔥 PromoGrind — Top Community Promos';

  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle(title)
    .setURL(BASE_URL)
    .setFooter({
      text: 'PromoGrind • Free sports betting tools',
      iconURL: 'https://vaultsparkstudios.com/promogrind/favicon.svg',
    })
    .setTimestamp();

  if (!promos || promos.length === 0) {
    embed.setDescription('No community promos found right now. Be the first to add one!');
    return embed;
  }

  const lines = promos.map((p, i) => {
    const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] ?? `${i + 1}.`;
    const book = p.book_name ?? 'Unknown Book';
    const type = p.promo_type ?? 'Promo';
    const value = p.promo_value ? `**${p.promo_value}**` : '';
    const votes = p.upvotes ?? 0;
    return `${rank} **${book}** — ${type} ${value}\n   ↑ ${votes} upvote${votes !== 1 ? 's' : ''}`;
  });

  embed.setDescription(lines.join('\n\n'));
  embed.addFields({
    name: 'Track & calculate every promo',
    value: `[Open PromoGrind](${BASE_URL}) — 27 free calculators, P/L ledger & more`,
  });

  return embed;
}

// ── Register slash commands with Discord ───────────────────────────────────────
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    console.log('Registering slash commands…');
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

// ── Post daily digest ──────────────────────────────────────────────────────────
async function postDailyDigest() {
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error('DISCORD_CHANNEL_ID is not a text channel.');
      return;
    }

    const promos = await fetchTopPromos({ last24h: true });
    const embed = buildPromoEmbed(promos, { isDaily: true });
    await channel.send({ embeds: [embed] });
    console.log('Daily digest posted.');
  } catch (err) {
    console.error('Error posting daily digest:', err);
  }
}

// ── Interaction handler ────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // /promos
  if (commandName === 'promos') {
    await interaction.deferReply();
    const promos = await fetchTopPromos({ last24h: false });
    const embed = buildPromoEmbed(promos);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // /calc
  if (commandName === 'calc') {
    const type = interaction.options.getString('type') ?? 'all';
    const meta = CALC_META[type] ?? CALC_META.all;
    const url = `${BASE_URL}${meta.path ? meta.path : ''}`;

    const embed = new EmbedBuilder()
      .setColor(0x4ade80)
      .setTitle(`PromoGrind — ${meta.label}`)
      .setURL(url)
      .setDescription(meta.desc)
      .addFields(
        { name: 'Open calculator', value: url },
        {
          name: 'Full suite',
          value: `[All 27 free calculators](${BASE_URL}) — no sign-up required`,
        }
      )
      .setFooter({ text: 'PromoGrind • Free sports betting tools' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    return;
  }
});

// ── Ready ──────────────────────────────────────────────────────────────────────
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Schedule daily digest at 9:00 AM (server local time)
  cron.schedule('0 9 * * *', () => {
    console.log('Running scheduled daily digest…');
    postDailyDigest();
  });

  console.log('Daily digest scheduled for 09:00 every day.');
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
await registerCommands();
client.login(DISCORD_TOKEN);
