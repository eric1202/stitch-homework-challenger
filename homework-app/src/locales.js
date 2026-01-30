export const en = {
    app: {
        title: 'Homework',
        subtitle: 'Hero',
        nav: {
            tasks: 'Tasks',
            analytics: 'Analytics',
            rewards: 'Rewards',
            settings: 'Settings'
        },
        totalPoints: 'Total Points',
        remainingPoints: 'Points Balance',
        points: 'Points',
        offlineReady: 'v1.0.0 • Offline Ready'
    },
    rewards: {
        title: 'Reward Store',
        manageTitle: 'Manage Rewards',
        subtitle: 'Spend your hard-earned points on cool prizes! 🎁',
        parentMode: 'Parent Mode',
        exitParentMode: 'Exit Parent Mode',
        addNew: 'Add New',
        noRewards: 'No rewards available yet.',
        addFirst: 'Add the first reward ✨',
        rewardsList: 'Rewards List',
        refreshing: 'Refreshing...',
        pullToRefresh: 'Pull to refresh',
        refreshList: 'Refresh List',
        redeeming: 'Redeeming...',
        saving: 'Saving...',
        refreshFail: 'Refresh failed, please try again',
        availableBalance: 'Available Balance',
        history: 'Redemption History',
        emptyHistory: 'No redemption history yet. Time to earn some points!',
        expired: 'Expired',
        soldOut: 'Sold Out',
        left: '{count} left',
        ends: 'Ends {date}',
        redeem: 'Redeem Now',
        needPoints: 'Need more points',
        deleteConfirm: 'Are you sure you want to delete this reward?',
        redeemFail: 'Redemption failed: ',
        outOfStock: 'Out of stock!',
        table: {
            reward: 'Reward',
            cost: 'Cost',
            date: 'Date',
            status: 'Status',
            success: 'Successfully Redeemed'
        },
        modal: {
            create: 'Create Reward',
            edit: 'Edit Reward',
            name: 'Reward Name',
            namePlaceholder: 'e.g. Extra 1hr Gaming',
            price: 'Price (Pts)',
            stock: 'Stock',
            icon: 'Choose Icon',
            expiry: 'Expiry Date (Optional)',
            btnCreate: 'Create Reward',
            btnUpdate: 'Update Reward'
        }
    },
    home: {
        title: "Today's Tasks",
        progress: 'Progress',
        noTasksTitle: 'No tasks for today',
        noTasksDesc: 'Add a new task to get started!',
        lockedMessage: 'All tasks completed! Today\'s mission is locked. 🔒',
        greeting: 'Hi {name},<br/>here is your mission! ',
        taskNameDisplay: 'Task Name',
        addTaskTitle: 'Add New Task',
        inputs: {
            taskName: 'Task Name',
            placeholder: 'e.g. Solve 10 Math Problems',
            subject: 'Subject',
            points: 'Points'
        },
        buttons: {
            add: 'Add'
        },
        reward: 'Reward',
        deleteConfirm: 'Are you sure you want to delete this task?',
        subjects: {
            Chinese: 'Chinese',
            Math: 'Math',
            English: 'English',
            Science: 'Science',
            Art: 'Art',
            Reading: 'Reading',
            Sports: 'Sports',
            Other: 'Other'
        }
    },
    analytics: {
        title: 'Analytics',
        subtitle: 'Track your progress over time',
        tipTitle: 'Hero Tip!',
        tipDesc: '{name}, your speed is increasing! Every mission completed gets you closer to greatness. 🚀',
        exportCsv: 'Export CSV',
        weekActivity: "This Week's Activity",
        history: 'History',
        table: {
            date: 'Date',
            task: 'Task',
            subject: 'Subject',
            points: 'Points',
            status: 'Status',
            empty: 'No history available yet.'
        },
        status: {
            completed: 'Completed',
            pending: 'Pending'
        },
        exportFileName: 'homework_history'
    },
    settings: {
        title: 'Settings',
        subtitle: 'Manage your data',
        dataManagement: {
            title: 'Data Management',
            desc: 'Backup your progress or transfer it to another device.',
            backupBtn: 'Backup Data',
            backupSub: 'Download JSON file',
            restoreBtn: 'Restore Data',
            restoreSub: 'Upload JSON file',
            backupFileName: 'homework_hero_backup',
            userName: 'User Name',
            editProfile: 'Edit Profile'
        },
        danger: {
            title: 'Danger Zone',
            desc: 'Once you delete your data, there is no going back. Please be certain.',
            resetBtn: 'Reset All Data'
        },
        alerts: {
            exportFail: 'Failed to export data: ',
            importConfirm: 'This will merge the imported data with your current data. Existing tasks with same IDs will be updated. Continue?',
            importSuccess: 'Successfully restored {count} tasks!',
            importFail: 'Error importing data: ',
            invalidFormat: 'Invalid backup file format',
            deleteConfirm1: 'DANGER: This will permanently delete ALL your task history and points. This cannot be undone. Are you absolutely sure?',
            deleteConfirm2: 'Please confirm one more time. Delete everything?',
            resetSuccess: 'All data has been reset.'
        }
    },
    dailyCheckin: {
        title: 'Daily Check-in',
        subtitle: 'Manage recurring homework tasks',
        addNew: 'Add Template',
        noTemplates: 'No templates yet',
        noTemplatesDesc: 'Create a template to auto-generate tasks',
        templateName: 'Task Name',
        templateNamePlaceholder: 'e.g. Read for 30 minutes',
        schedule: 'Schedule',
        selectDays: 'Select Days',
        scheduleTypes: {
            daily: 'Daily',
            weekdays: 'Weekdays',
            weekends: 'Weekends',
            custom: 'Custom'
        },
        days: {
            sun: 'Sun',
            mon: 'Mon',
            tue: 'Tue',
            wed: 'Wed',
            thu: 'Thu',
            fri: 'Fri',
            sat: 'Sat'
        },
        dateRange: 'Date Range',
        startDate: 'Start Date',
        endDate: 'End Date (Optional)',
        createBtn: 'Create & Generate Tasks',
        editBtn: 'Update',
        deleteConfirm: 'Delete this template?',
        deleteWithTasks: 'Also delete generated tasks',
        tasksGenerated: '{count} tasks generated',
        modal: {
            create: 'Create Template',
            edit: 'Edit Template'
        }
    }
};

export const zh = {
    app: {
        title: '作业',
        subtitle: '小英雄',
        nav: {
            tasks: '今日作业',
            analytics: '统计报表',
            rewards: '积分商城',
            settings: '设置管理'
        },
        totalPoints: '总积分',
        remainingPoints: '当前余额',
        points: '积分',
        offlineReady: 'v1.0.0 • 支持离线使用'
    },
    rewards: {
        title: '积分商城',
        manageTitle: '管理礼品',
        subtitle: '用你努力赚来的积分兑换愿望吧！🎁',
        parentMode: '家长模式',
        exitParentMode: '退出家长模式',
        addNew: '新增礼品',
        noRewards: '商城里还没有礼品哦。',
        addFirst: '添加第一个礼品 ✨',
        rewardsList: '奖励列表',
        refreshing: '刷新中...',
        pullToRefresh: '下拉刷新',
        refreshList: '刷新列表',
        redeeming: '兑换中...',
        saving: '保存中...',
        refreshFail: '刷新失败，请重试',
        availableBalance: '当前可用积分',
        history: '兑换记录',
        emptyHistory: '还没有兑换过礼品，快去赚积分吧！',
        expired: '已过期',
        soldOut: '已售罄',
        left: '剩余 {count}',
        ends: '{date} 截止',
        redeem: '立即兑换',
        needPoints: '积分不足',
        deleteConfirm: '确定要删除这个礼品吗？',
        redeemFail: '兑换失败: ',
        outOfStock: '库存不足！',
        table: {
            reward: '礼品名称',
            cost: '消费积分',
            date: '兑换时间',
            status: '状态',
            success: '兑换成功'
        },
        modal: {
            create: '新增礼品',
            edit: '编辑礼品',
            name: '礼品名称',
            namePlaceholder: '例如：多玩1小时游戏',
            price: '所需积分',
            stock: '库存数量',
            icon: '选择图标',
            expiry: '有效期 (可选)',
            btnCreate: '确认新增',
            btnUpdate: '保存修改'
        }
    },
    home: {
        title: "今日作业",
        progress: '今日进度',
        noTasksTitle: '今天还没有作业哦',
        noTasksDesc: '快添加一项新任务开始吧！',
        lockedMessage: '今日作业已全部完成！任务已锁定。🔒',
        greeting: '你好 {name}，\n这是你的今日挑战！',
        taskNameDisplay: '任务名称',
        addTaskTitle: '添加新作业',
        inputs: {
            taskName: '作业名称',
            placeholder: '例如：完成10道数学题',
            subject: '科目',
            points: '积分奖励'
        },
        buttons: {
            add: '添加'
        },
        reward: '奖励',
        deleteConfirm: '确定要删除这项作业吗？',
        subjects: {
            Chinese: '语文',
            Math: '数学',
            English: '英语',
            Science: '科学',
            Art: '美术',
            Reading: '阅读',
            Sports: '体育',
            Other: '其他'
        }
    },
    analytics: {
        title: '统计报表',
        subtitle: '记录你的每一次进步',
        tipTitle: '小英雄提示！',
        tipDesc: '{name}，你的完成效率正在提高！每一次挑战都让你离伟大更近一步。🚀',
        exportCsv: '导出表格',
        weekActivity: "本周表现",
        history: '历史记录',
        table: {
            date: '日期',
            task: '任务',
            subject: '科目',
            points: '积分',
            status: '状态',
            empty: '暂时没有历史记录。'
        },
        status: {
            completed: '已完成',
            pending: '未完成'
        },
        exportFileName: '作业打卡记录表'
    },
    settings: {
        title: '设置管理',
        subtitle: '管理你的数据',
        dataManagement: {
            title: '数据管理',
            desc: '备份你的进度，或将其转移到其他设备。',
            backupBtn: '数据备份',
            backupSub: '下载 JSON 文件',
            restoreBtn: '数据恢复',
            restoreSub: '上传 JSON 文件',
            backupFileName: '作业小英雄备份',
            userName: '用户姓名',
            editProfile: '修改资料'
        },
        danger: {
            title: '危险区域',
            desc: '一旦删除数据，将无法恢复。请谨慎操作。',
            resetBtn: '清空所有数据'
        },
        alerts: {
            exportFail: '导出失败: ',
            importConfirm: '这将把导入的数据与当前数据合并。相同ID的任务将被更新。是否继续？',
            importSuccess: '成功恢复了 {count} 项任务！',
            importFail: '导入出错: ',
            invalidFormat: '无效的备份文件格式',
            deleteConfirm1: '危险警告：这将永久删除所有的作业记录和积分。此操作无法撤销。你确定要这样做吗？',
            deleteConfirm2: '请再次确认。真的要删除所有内容吗？',
            resetSuccess: '所有数据已重置。'
        }
    },
    dailyCheckin: {
        title: '每日打卡',
        subtitle: '管理周期性作业任务',
        addNew: '新增模板',
        noTemplates: '暂无打卡模板',
        noTemplatesDesc: '创建模板后可自动生成周期任务',
        templateName: '任务名称',
        templateNamePlaceholder: '例如：朗读课文30分钟',
        schedule: '重复周期',
        selectDays: '选择日期',
        scheduleTypes: {
            daily: '每天',
            weekdays: '工作日',
            weekends: '周末',
            custom: '自定义'
        },
        days: {
            sun: '周日',
            mon: '周一',
            tue: '周二',
            wed: '周三',
            thu: '周四',
            fri: '周五',
            sat: '周六'
        },
        dateRange: '日期范围',
        startDate: '开始日期',
        endDate: '结束日期（可选）',
        createBtn: '创建并生成任务',
        editBtn: '更新',
        deleteConfirm: '确定删除此模板？',
        deleteWithTasks: '同时删除已生成的任务',
        tasksGenerated: '已生成 {count} 个任务',
        modal: {
            create: '新建模板',
            edit: '编辑模板'
        }
    }
};
