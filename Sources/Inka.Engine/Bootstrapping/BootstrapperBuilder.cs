﻿// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Core;
using Carcass.Core.Locators;
using Microsoft.Extensions.DependencyInjection;

namespace Inka.Engine.Bootstrapping;

public sealed class BootstrapperBuilder
{
    private readonly BootstrapperContext _bootstrapperContext;

    public BootstrapperBuilder(BootstrapperContext bootstrapperContext)
    {
        ArgumentVerifier.NotNull(bootstrapperContext, nameof(bootstrapperContext));

        _bootstrapperContext = bootstrapperContext;
    }

    public Bootstrapper Configure(Action<BootstrapperContext> configureAction)
    {
        ArgumentVerifier.NotNull(configureAction, nameof(configureAction));

        configureAction.Invoke(_bootstrapperContext);

        if (_bootstrapperContext.PipelineBLocks is null)
            throw new InvalidOperationException("Pipeline is not configured.");

        _bootstrapperContext.Services.AddSingleton(_bootstrapperContext.PipelineBLocks);

        ServiceProviderLocator.Set(_bootstrapperContext.Services.BuildServiceProvider());

        return new Bootstrapper();
    }
}