// Data Migration - Moves localStorage data to Supabase after login

async function migrateLocalDataToSupabase() {
    const { user } = await getCurrentUser();
    if (!user) {
        console.log('No user logged in, skipping migration');
        return;
    }
    
    console.log('Checking for local data to migrate...');
    
    // Check if already migrated
    const migrationFlag = localStorage.getItem('destinylens_migrated_' + user.id);
    if (migrationFlag) {
        console.log('Data already migrated for this user');
        return;
    }
    
    let hasDataToMigrate = false;
    
    // Migrate calculation
    const calculation = JSON.parse(localStorage.getItem('destinylens_calculation') || '{}');
    if (calculation.daily) {
        console.log('Migrating calculation...');
        const calcData = {
            home_description: calculation.answers?.home?.description || '',
            home_monthly_amount: calculation.answers?.home?.amount || 0,
            vehicle_description: calculation.answers?.vehicle?.description || '',
            vehicle_monthly_amount: calculation.answers?.vehicle?.amount || 0,
            travel_description: calculation.answers?.travel?.description || '',
            travel_monthly_amount: calculation.answers?.travel?.amount || 0,
            food_description: calculation.answers?.food?.description || '',
            food_monthly_amount: calculation.answers?.food?.amount || 0,
            trainer_description: calculation.answers?.trainer?.description || '',
            trainer_monthly_amount: calculation.answers?.trainer?.amount || 0,
            chef_description: calculation.answers?.chef?.description || '',
            chef_monthly_amount: calculation.answers?.chef?.amount || 0,
            college_description: calculation.answers?.college?.description || '',
            college_monthly_amount: calculation.answers?.college?.amount || 0,
            retirement_description: calculation.answers?.retirement?.description || '',
            retirement_monthly_amount: calculation.answers?.retirement?.amount || 0,
            monthly_total: calculation.monthly || 0,
            yearly_total: calculation.yearly || 0,
            weekly_total: calculation.weekly || 0,
            daily_total: calculation.daily || 0,
            hourly_total: calculation.hourly || 0,
            is_active: true
        };
        
        const { data: calcResult, error: calcError } = await supabaseClient
            .from('dream_life_calculations')
            .insert(calcData)
            .select()
            .single();
        
        if (calcError) {
            console.error('Error migrating calculation:', calcError);
        } else {
            console.log('Calculation migrated:', calcResult);
            hasDataToMigrate = true;
            
            // Create dashboard settings linked to this calculation
            const { error: settingsError } = await supabaseClient
                .from('dashboard_settings')
                .insert({
                    active_calculation_id: calcResult.id,
                    daily_income_target: calculation.daily || 0,
                    weekly_income_target: calculation.weekly || 0,
                    monthly_income_target: calculation.monthly || 0,
                    yearly_income_target: calculation.yearly || 0,
                    hourly_income_target: calculation.hourly || 0
                });
            
            if (settingsError) {
                console.error('Error creating dashboard settings:', settingsError);
            }
        }
    }
    
    // Migrate goals
    const goals = JSON.parse(localStorage.getItem('destinylens_goals') || '[]');
    if (goals.length > 0) {
        console.log('Migrating', goals.length, 'goals...');
        
        // Get dashboard settings
        const { data: settings } = await supabaseClient
            .from('dashboard_settings')
            .select('id')
            .single();
        
        if (settings) {
            const goalsData = goals.map((g, i) => ({
                dashboard_id: settings.id,
                title: g.title,
                icon: g.icon,
                monthly_amount: g.amount || 0,
                image_url: g.image || 'dashboard-preview.jpg',
                sort_order: i,
                visible: true
            }));
            
            const { error: goalsError } = await supabaseClient
                .from('goal_cards')
                .insert(goalsData);
            
            if (goalsError) {
                console.error('Error migrating goals:', goalsError);
            } else {
                console.log('Goals migrated successfully');
                hasDataToMigrate = true;
            }
        }
    }
    
    // Migrate income entries
    const entries = JSON.parse(localStorage.getItem('destinylens_income_entries') || '[]');
    if (entries.length > 0) {
        console.log('Migrating', entries.length, 'income entries...');
        
        const entriesData = entries.map(e => ({
            amount: e.amount || 0,
            income_source_label: e.source || 'Manual Entry',
            entry_date: e.date ? e.date.split('T')[0] : new Date().toISOString().split('T')[0],
            note: e.note || '',
            include_in_dashboard: true
        }));
        
        const { error: entriesError } = await supabaseClient
            .from('manual_income_entries')
            .insert(entriesData);
        
        if (entriesError) {
            console.error('Error migrating income entries:', entriesError);
        } else {
            console.log('Income entries migrated successfully');
            hasDataToMigrate = true;
        }
    }
    
    // Migrate background image
    const background = localStorage.getItem('destinylens_background');
    if (background && background !== 'dashboard-preview.jpg') {
        console.log('Migrating background image...');
        
        const { data: settings } = await supabaseClient
            .from('dashboard_settings')
            .select('id')
            .single();
        
        if (settings) {
            // Note: In production, you'd upload to Supabase Storage first
            // For now, we'll store the base64 data (may hit size limits)
            const { error: imgError } = await supabaseClient
                .from('dashboard_images')
                .insert({
                    dashboard_id: settings.id,
                    image_url: background,
                    image_type: 'background',
                    is_active_background: true
                });
            
            if (imgError) {
                console.error('Error migrating background:', imgError);
            } else {
                console.log('Background migrated');
                hasDataToMigrate = true;
            }
        }
    }
    
    // Mark as migrated
    if (hasDataToMigrate) {
        localStorage.setItem('destinylens_migrated_' + user.id, 'true');
        console.log('Migration complete!');
        
        // Optionally clear localStorage after successful migration
        // Uncomment the next line if you want to clear local data after migration
        // clearMigratedLocalData();
    } else {
        console.log('No local data found to migrate');
        localStorage.setItem('destinylens_migrated_' + user.id, 'true');
    }
}

function clearMigratedLocalData() {
    const keysToRemove = [
        'destinylens_calculation',
        'destinylens_goals',
        'destinylens_income_entries',
        'destinylens_background',
        'destinylens_today_manual'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log('Cleared migrated local data');
}

// Run migration after auth is confirmed
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for auth to initialize
    setTimeout(() => {
        migrateLocalDataToSupabase();
    }, 1000);
});
