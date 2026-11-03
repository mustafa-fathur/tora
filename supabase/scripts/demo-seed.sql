-- Demo data: about 6 months of made-up, realistic Indonesian personal finance
-- for ONE user, so pages look like they do after regular use. All amounts are
-- random (fixed seed); nothing here is real. Run with scripts/demo-data.sh.
-- One statement (the CLI runs a file as one query). Refuses if the user has accounts.

do $seed$
declare
  target_email text := '__TARGET_EMAIL__'; -- filled in by scripts/demo-data.sh
  uid uuid;
  start_date date := (date_trunc('month', current_date) - interval '5 months')::date;
  this_month date := date_trunc('month', current_date)::date;
  d date;
  dom int;
  dow int;
  is_month_end boolean;
  month_index int;
  amount numeric;
  -- accounts
  bca uuid; jago uuid; gopay uuid; cash uuid; card uuid; paylater uuid; fund uuid; wise uuid;
  -- running balances (to keep wallets realistic)
  b numeric := 11500000; g numeric := 150000; c numeric := 300000; k numeric := -1250000; p numeric := 0; f numeric := 15000000;
  -- recurring items
  r_kos uuid; r_bpjs uuid; r_family uuid; r_pln uuid; r_indihome uuid; r_telkomsel uuid; r_netflix uuid; r_spotify uuid; r_gym uuid; r_salary uuid;
  -- categories
  c_groceries uuid; c_eating uuid; c_coffee uuid; c_fuel uuid; c_ride uuid; c_parking uuid; c_rent uuid; c_household uuid;
  c_electricity uuid; c_water uuid; c_internet uuid; c_subs uuid; c_clothing uuid; c_electronics uuid; c_homegoods uuid;
  c_medical uuid; c_pharmacy uuid; c_insurance uuid; c_fitness uuid; c_entertainment uuid; c_hobbies uuid; c_personal uuid;
  c_family uuid; c_gifts uuid; c_donation uuid; c_events uuid; c_courses uuid; c_books uuid; c_fees uuid;
  c_salary uuid; c_freelance uuid; c_investment uuid;
begin
  -- Helpers (temporary: they disappear when the session ends).
  execute $fn$
create or replace function pg_temp.amt(lo numeric, hi numeric, step numeric default 500)
returns numeric language sql volatile as
$body$ select round((lo + random() * (hi - lo)) / step) * step $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.tm(h_lo int, h_hi int)
returns time language sql volatile as
$body$ select make_time(h_lo + floor(random() * (h_hi - h_lo + 1))::int, floor(random() * 60)::int, 0) $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.pick(options text[])
returns text language sql volatile as
$body$ select options[1 + floor(random() * array_length(options, 1))::int] $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.cat(uid uuid, n text)
returns uuid language sql stable as
$body$ select id from public.categories where user_id = uid and name = n order by parent_id nulls last limit 1 $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.typ(uid uuid, n text)
returns uuid language sql stable as
$body$ select id from public.account_types where user_id = uid and name = n limit 1 $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.spend(
  uid uuid, acct uuid, d date, t time, amount numeric, cat uuid, descr text, rec uuid default null
) returns void language sql as
$body$ insert into public.transactions (user_id, account_id, kind, amount, date, time, category_id, description, recurring_item_id)
   values (uid, acct, 'regular', amount, d, t, cat, descr, rec) $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.move(
  uid uuid, src uuid, dst uuid, d date, t time, amount numeric, out_text text, in_text text
) returns void language sql as
$body$ with tid as materialized (select gen_random_uuid() as id)
   insert into public.transactions (user_id, account_id, kind, amount, date, time, description, transfer_id)
   select uid, src, 'transfer'::public.transaction_kind, -amount, d, t, out_text, id from tid
   union all
   select uid, dst, 'transfer'::public.transaction_kind, amount, d, t, in_text, id from tid $body$
  $fn$;
  execute $fn$
create or replace function pg_temp.next_due(dom int)
returns date language sql stable as
$body$ select case
     when extract(day from current_date) < dom then make_date(extract(year from current_date)::int, extract(month from current_date)::int, dom)
     else (date_trunc('month', current_date) + interval '1 month' + make_interval(days => dom - 1))::date
   end $body$
  $fn$;

  select id into uid from auth.users where email = target_email;
  if uid is null then
    raise exception 'No user with email %', target_email;
  end if;
  if exists (select 1 from public.accounts where user_id = uid) then
    raise exception 'This user already has accounts. Run the reset first (scripts/demo-data.sh reset …).';
  end if;

  perform setseed(0.42);
  perform public.seed_default_categories(uid);
  perform public.seed_default_account_types(uid);

  c_groceries := pg_temp.cat(uid, 'Groceries'); c_eating := pg_temp.cat(uid, 'Eating out'); c_coffee := pg_temp.cat(uid, 'Coffee & snacks');
  c_fuel := pg_temp.cat(uid, 'Fuel'); c_ride := pg_temp.cat(uid, 'Ride-hailing'); c_parking := pg_temp.cat(uid, 'Parking & tolls');
  c_rent := pg_temp.cat(uid, 'Rent & mortgage'); c_household := pg_temp.cat(uid, 'Household supplies');
  c_electricity := pg_temp.cat(uid, 'Electricity'); c_water := pg_temp.cat(uid, 'Water'); c_internet := pg_temp.cat(uid, 'Internet & phone');
  c_subs := pg_temp.cat(uid, 'Subscriptions'); c_clothing := pg_temp.cat(uid, 'Clothing'); c_electronics := pg_temp.cat(uid, 'Electronics');
  c_homegoods := pg_temp.cat(uid, 'Home goods'); c_medical := pg_temp.cat(uid, 'Medical'); c_pharmacy := pg_temp.cat(uid, 'Pharmacy');
  c_insurance := pg_temp.cat(uid, 'Insurance'); c_fitness := pg_temp.cat(uid, 'Fitness'); c_entertainment := pg_temp.cat(uid, 'Entertainment');
  c_hobbies := pg_temp.cat(uid, 'Hobbies'); c_personal := pg_temp.cat(uid, 'Personal care'); c_family := pg_temp.cat(uid, 'Family support');
  c_gifts := pg_temp.cat(uid, 'Gifts'); c_donation := pg_temp.cat(uid, 'Donations & zakat'); c_events := pg_temp.cat(uid, 'Events & weddings');
  c_courses := pg_temp.cat(uid, 'Courses'); c_books := pg_temp.cat(uid, 'Books'); c_fees := pg_temp.cat(uid, 'Bank fees');
  c_salary := pg_temp.cat(uid, 'Salary'); c_freelance := pg_temp.cat(uid, 'Freelance'); c_investment := pg_temp.cat(uid, 'Investment income');

  -- Accounts (created at the start, so net worth history covers the period).
  insert into public.accounts (user_id, name, type_id, opening_balance, institution, sort_order, created_at) values
    (uid, 'BCA', pg_temp.typ(uid, 'Bank account'), b, 'BCA', 1, start_date) returning id into bca;
  insert into public.accounts (user_id, name, type_id, opening_balance, institution, sort_order, created_at) values
    (uid, 'Tabungan Darurat', pg_temp.typ(uid, 'Bank account'), 12000000, 'Bank Jago', 2, start_date) returning id into jago;
  insert into public.accounts (user_id, name, type_id, opening_balance, sort_order, created_at) values
    (uid, 'GoPay', pg_temp.typ(uid, 'E-wallet'), g, 3, start_date) returning id into gopay;
  insert into public.accounts (user_id, name, type_id, opening_balance, sort_order, created_at) values
    (uid, 'Dompet', pg_temp.typ(uid, 'Cash'), c, 4, start_date) returning id into cash;
  insert into public.accounts (user_id, name, type_id, opening_balance, institution, sort_order, created_at) values
    (uid, 'Kartu Kredit', pg_temp.typ(uid, 'Credit card'), k, 'BNI', 5, start_date) returning id into card;
  insert into public.accounts (user_id, name, type_id, opening_balance, sort_order, created_at) values
    (uid, 'Shopee PayLater', pg_temp.typ(uid, 'Paylater'), 0, 6, start_date) returning id into paylater;
  insert into public.accounts (user_id, name, type_id, opening_balance, institution, sort_order, created_at) values
    (uid, 'Reksa Dana', pg_temp.typ(uid, 'Investment'), f, 'Bibit', 7, start_date) returning id into fund;
  insert into public.accounts (user_id, name, type_id, currency, opening_balance, institution, sort_order, created_at) values
    (uid, 'Wise USD', pg_temp.typ(uid, 'Bank account'), 'USD', 250, 'Wise', 8, start_date) returning id into wise;

  insert into public.exchange_rates (user_id, currency, rate, source) values (uid, 'USD', 16250, 'manual')
    on conflict (user_id, currency) do update set rate = excluded.rate;

  -- Recurring items (next due dates set relative to today; BPJS is left overdue on purpose).
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Kos', -2750000, bca, c_rent, 'monthly', pg_temp.next_due(1)) returning id into r_kos;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'BPJS Kesehatan', -150000, bca, c_insurance, 'monthly', this_month) returning id into r_bpjs;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Kirim ke orang tua', -750000, bca, c_family, 'monthly', pg_temp.next_due(2)) returning id into r_family;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Token PLN', -300000, bca, c_electricity, 'monthly', pg_temp.next_due(5)) returning id into r_pln;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'IndiHome', -385000, bca, c_internet, 'monthly', pg_temp.next_due(5)) returning id into r_indihome;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Paket data Telkomsel', -100000, gopay, c_internet, 'monthly', pg_temp.next_due(10)) returning id into r_telkomsel;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Netflix', -120000, card, c_subs, 'monthly', pg_temp.next_due(12)) returning id into r_netflix;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Spotify', -55000, card, c_subs, 'monthly', pg_temp.next_due(12)) returning id into r_spotify;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Gym', -350000, bca, c_fitness, 'monthly', pg_temp.next_due(15)) returning id into r_gym;
  insert into public.recurring_items (user_id, name, amount, account_id, category_id, frequency, next_due_date) values
    (uid, 'Gaji bulanan', 12500000, bca, c_salary, 'monthly', pg_temp.next_due(25)) returning id into r_salary;

  for d in select generate_series(start_date, current_date, interval '1 day')::date loop
    dom := extract(day from d);
    dow := extract(isodow from d); -- 1 = Monday … 7 = Sunday
    is_month_end := d = (date_trunc('month', d) + interval '1 month - 1 day')::date;
    month_index := (extract(year from d) * 12 + extract(month from d))::int;

    -- Keep the e-wallet and the wallet topped up, like real life.
    if g < 250000 then
      perform pg_temp.move(uid, bca, gopay, d, '07:15', 300000, 'Top up GoPay', 'Top up from BCA'); b := b - 300000; g := g + 300000;
    end if;
    if c < 120000 then
      perform pg_temp.move(uid, bca, cash, d, '07:40', 500000, 'Tarik tunai ATM', 'Tarik tunai ATM'); b := b - 500000; c := c + 500000;
    end if;

    -- Monthly fixed items.
    if dom = 1 then
      perform pg_temp.spend(uid, bca, d, '08:05', -2750000, c_rent, 'Kos', r_kos); b := b - 2750000;
      if d < this_month then
        perform pg_temp.spend(uid, bca, d, '08:10', -150000, c_insurance, 'BPJS Kesehatan', r_bpjs); b := b - 150000;
      end if;
    end if;
    if dom = 2 then
      perform pg_temp.spend(uid, bca, d, '19:30', -750000, c_family, 'Kirim ke orang tua', r_family); b := b - 750000;
    end if;
    if dom = 5 then
      perform pg_temp.spend(uid, bca, d, '09:00', -300000, c_electricity, 'Token PLN', r_pln); b := b - 300000;
      perform pg_temp.spend(uid, bca, d, '09:02', -385000, c_internet, 'IndiHome', r_indihome); b := b - 385000;
      amount := pg_temp.amt(95000, 145000, 1000);
      perform pg_temp.spend(uid, bca, d, '09:05', -amount, c_water, 'PDAM'); b := b - amount;
      if p < 0 then
        perform pg_temp.move(uid, bca, paylater, d, '09:10', -p, 'Bayar Shopee PayLater', 'Pembayaran dari BCA'); b := b + p; p := 0;
      end if;
    end if;
    if dom = 10 then
      perform pg_temp.spend(uid, gopay, d, '10:15', -100000, c_internet, 'Paket data Telkomsel', r_telkomsel); g := g - 100000;
    end if;
    if dom = 12 then
      perform pg_temp.spend(uid, card, d, '06:00', -120000, c_subs, 'Netflix', r_netflix); k := k - 120000;
      perform pg_temp.spend(uid, card, d, '06:01', -55000, c_subs, 'Spotify', r_spotify); k := k - 55000;
    end if;
    if dom = 14 then
      amount := pg_temp.amt(35000, 60000, 5000);
      perform pg_temp.spend(uid, cash, d, '16:20', -amount, c_personal, 'Potong rambut'); c := c - amount;
    end if;
    if dom = 15 then
      perform pg_temp.spend(uid, bca, d, '07:00', -350000, c_fitness, 'Gym', r_gym); b := b - 350000;
    end if;
    if dom = 18 and month_index % 2 = 1 then
      amount := pg_temp.amt(180, 320, 5);
      perform pg_temp.spend(uid, wise, d, '22:10', amount, c_freelance, 'Freelance - website project');
    end if;
    if dom = 27 and k < 0 then -- card paid right after payday
      perform pg_temp.move(uid, bca, card, d, '20:00', -k, 'Bayar kartu kredit', 'Pembayaran dari BCA'); b := b + k; k := 0;
    end if;
    if dom = 25 then
      perform pg_temp.spend(uid, bca, d, '10:00', 12500000, c_salary, 'Gaji bulanan', r_salary); b := b + 12500000;
    end if;
    if dom = 26 then
      perform pg_temp.move(uid, bca, jago, d, '08:00', 1000000, 'Nabung dana darurat', 'Dari BCA'); b := b - 1000000;
      perform pg_temp.move(uid, bca, fund, d, '08:05', 750000, 'Investasi reksa dana', 'Top up dari BCA'); b := b - 750000; f := f + 750000;
    end if;
    if dom = 28 then
      perform pg_temp.spend(uid, bca, d, '00:05', -15000, c_fees, 'Biaya administrasi'); b := b - 15000;
    end if;
    if is_month_end then
      amount := pg_temp.amt(25000, 45000, 100);
      perform pg_temp.spend(uid, jago, d, '23:59', amount, c_investment, 'Bunga tabungan');
      -- Fund value moves -1.5% … +2.5%; recorded as a balance update, not income.
      amount := round(f * (-0.015 + random() * 0.04) / 1000) * 1000;
      if amount <> 0 then
        insert into public.transactions (user_id, account_id, kind, amount, date, time, description)
        values (uid, fund, 'adjustment', amount, d, '23:00', 'Nilai reksa dana');
        f := f + amount;
      end if;
    end if;

    -- Everyday spending.
    if dow <= 5 then
      if random() < 0.55 then
        amount := pg_temp.amt(18000, 32000);
        perform pg_temp.spend(uid, gopay, d, pg_temp.tm(7, 9), -amount, c_coffee,
          pg_temp.pick(array['Kopi Kenangan', 'Fore Coffee', 'Janji Jiwa', 'Kopi Tuku', 'Point Coffee'])); g := g - amount;
      end if;
      if random() < 0.85 then
        amount := pg_temp.amt(18000, 40000);
        if random() < 0.5 then
          perform pg_temp.spend(uid, cash, d, pg_temp.tm(11, 13), -amount, c_eating,
            pg_temp.pick(array['Nasi Padang', 'Warteg', 'Bakso', 'Ayam Geprek', 'Mie Ayam', 'Soto Betawi', 'Gado-gado'])); c := c - amount;
        else
          perform pg_temp.spend(uid, gopay, d, pg_temp.tm(11, 13), -amount, c_eating,
            pg_temp.pick(array['Nasi Goreng', 'Ayam Geprek', 'Warung Sunda', 'Sate Padang'])); g := g - amount;
        end if;
      end if;
      if random() < 0.45 then
        amount := pg_temp.amt(12000, 38000);
        perform pg_temp.spend(uid, gopay, d, pg_temp.tm(7, 8), -amount, c_ride, pg_temp.pick(array['Gojek', 'GoCar'])); g := g - amount;
      end if;
      if random() < 0.2 then
        amount := pg_temp.amt(2000, 5000, 1000);
        perform pg_temp.spend(uid, cash, d, pg_temp.tm(9, 18), -amount, c_parking, 'Parkir'); c := c - amount;
      end if;
      if dow = 5 and random() < 0.6 then
        amount := pg_temp.amt(10000, 50000, 5000);
        perform pg_temp.spend(uid, cash, d, '12:10', -amount, c_donation, 'Infaq Jumat'); c := c - amount;
      end if;
    else
      if dow = 6 then
        amount := pg_temp.amt(180000, 520000, 1000);
        perform pg_temp.spend(uid, bca, d, pg_temp.tm(9, 11), -amount, c_groceries,
          pg_temp.pick(array['Superindo', 'Indomaret', 'Alfamart', 'Hypermart', 'Pasar'])); b := b - amount;
        if random() < 0.12 then
          amount := pg_temp.amt(200000, 500000, 50000);
          perform pg_temp.spend(uid, bca, d, pg_temp.tm(11, 13), -amount, c_events, 'Kondangan (amplop digital)'); b := b - amount;
        end if;
      end if;
      if random() < 0.45 then
        amount := pg_temp.amt(80000, 260000, 1000);
        perform pg_temp.spend(uid, card, d, pg_temp.tm(18, 20), -amount, c_eating,
          pg_temp.pick(array['Sushi Tei', 'Solaria', 'Bakmi GM', 'Hokben', 'Mie Gacoan', 'Pizza'])); k := k - amount;
      end if;
      if random() < 0.15 then
        amount := pg_temp.amt(50000, 120000, 5000);
        perform pg_temp.spend(uid, card, d, pg_temp.tm(14, 20), -amount, c_entertainment, pg_temp.pick(array['XXI', 'CGV'])); k := k - amount;
      end if;
    end if;

    if random() < 0.25 then
      amount := pg_temp.amt(35000, 95000);
      perform pg_temp.spend(uid, gopay, d, pg_temp.tm(19, 21), -amount, c_eating,
        pg_temp.pick(array['GoFood - Martabak', 'GoFood - Sate Ayam', 'GoFood - Seblak', 'GoFood - Ayam Bakar', 'GoFood - Pecel Lele'])); g := g - amount;
    end if;
    if dom % 5 = 0 then
      amount := pg_temp.amt(30000, 60000, 1000);
      perform pg_temp.spend(uid, cash, d, pg_temp.tm(7, 18), -amount, c_fuel, pg_temp.pick(array['Pertamina', 'Shell'])); c := c - amount;
    end if;
    if random() < 0.07 then
      amount := pg_temp.amt(80000, 450000, 1000);
      perform pg_temp.spend(uid, paylater, d, pg_temp.tm(20, 23), -amount,
        (array[c_clothing, c_homegoods, c_electronics, c_household])[1 + floor(random() * 4)::int],
        pg_temp.pick(array['Shopee - Kaos', 'Shopee - Rak buku', 'Shopee - Charger', 'Shopee - Sabun & sampo', 'Shopee - Sepatu'])); p := p - amount;
    end if;
    if random() < 0.05 then
      amount := pg_temp.amt(25000, 150000, 1000);
      perform pg_temp.spend(uid, gopay, d, pg_temp.tm(10, 21), -amount, c_pharmacy, pg_temp.pick(array['Apotek K-24', 'Kimia Farma', 'Guardian'])); g := g - amount;
    end if;
    if random() < 0.04 then
      amount := pg_temp.amt(65000, 160000, 1000);
      perform pg_temp.spend(uid, card, d, pg_temp.tm(13, 20), -amount, c_books, 'Gramedia'); k := k - amount;
    end if;
  end loop;

  -- A few one-offs that make the data feel lived-in.
  perform pg_temp.spend(uid, bca, start_date + 40, '10:30', -175000, c_medical, 'Klinik - dokter umum'); b := b - 175000;
  perform pg_temp.spend(uid, card, start_date + 55, '21:00', -189000, c_courses, 'Udemy - kursus desain');
  perform pg_temp.spend(uid, card, start_date + 70, '15:00', -450000, c_hobbies, 'Tokopedia - Lego');
  perform pg_temp.spend(uid, bca, start_date + 95, '18:00', -500000, c_gifts, 'Kado ulang tahun adik');
  perform pg_temp.spend(uid, paylater, start_date + 100, '11:00', 129000, c_clothing, 'Refund Shopee - sepatu kekecilan');
  -- Recent spending without a category (shows the "needs a category" insight).
  perform pg_temp.spend(uid, gopay, current_date, '13:40', -27000, null, 'QRIS - Toko Sinar Jaya');
  perform pg_temp.spend(uid, cash, current_date, '17:15', -15000, null, 'QRIS - Warung Bu Ani');
  perform pg_temp.spend(uid, bca, current_date - 1, '20:05', -150000, null, 'Transfer ke Rizky');

  -- Budgets for every month in range (food runs over most months, like real life).
  insert into public.budgets (user_id, category_id, month, amount)
  select uid, pg_temp.cat(uid, bud.name), m::date, bud.amount
  from generate_series(start_date, this_month, interval '1 month') as m,
    (values ('Food & Drinks', 2800000), ('Transport', 900000), ('Bills', 1100000), ('Housing', 2900000),
            ('Shopping', 800000), ('Lifestyle', 600000), ('Health', 600000), ('Family & Giving', 1200000)) as bud(name, amount);

  -- Goals: one tracks a savings account, two are saved by hand.
  insert into public.goals (user_id, name, target_amount, target_date, account_id) values
    (uid, 'Dana darurat 6 bulan', 45000000, (current_date + interval '18 months')::date, jago);
  insert into public.goals (user_id, name, target_amount, target_date, saved_amount) values
    (uid, 'Laptop baru', 22000000, (current_date + interval '8 months')::date, 6500000),
    (uid, 'Liburan ke Bali', 8000000, (current_date + interval '5 months')::date, 2000000);

  raise notice 'Demo data created for %', target_email;
end;
$seed$;
